'use server';

import React from 'react';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { pdf } from '@react-pdf/renderer';
import { Packer } from 'docx';
import { ToolService } from '@/services/toolService';
import { AddressLabelService } from '@/services/addressLabelService';
import { MPHelper } from '@/lib/providers/ministry-platform';
import type { ContactAddressRow } from '@/services/addressLabelService';
import type { ToolParams } from '@/lib/tool-params';
import type {
  LabelData,
  SkipRecord,
  LabelConfig,
  FetchAddressLabelsResult,
} from '@/lib/dto';
import { LabelDocument } from './label-document';
import { buildWordDocument } from './word-document';
import { getLabelStock } from '@/lib/label-stock';
import { imbEncode } from '@/lib/imb-encoder';
import { postnetEncode } from '@/lib/postnet-encoder';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

async function getMPUserId(session: Awaited<ReturnType<typeof getSession>>): Promise<number> {
  const userGuid = (session.user as Record<string, unknown>).userGuid as string | undefined;
  if (!userGuid) throw new Error('User GUID not found in session');

  const mp = new MPHelper();
  const records = await mp.getTableRecords<{ User_ID: number }>({
    table: 'dp_Users',
    filter: `User_GUID = '${userGuid}'`,
    select: 'User_ID',
    top: 1,
  });

  if (!records || records.length === 0) throw new Error('MP user not found');
  return records[0].User_ID;
}

function filterAndTransform(
  rows: ContactAddressRow[],
  config: LabelConfig
): FetchAddressLabelsResult {
  const printable: LabelData[] = [];
  const skipped: SkipRecord[] = [];
  const seenHouseholds = new Set<number>();

  for (const row of rows) {
    const name = config.addressMode === 'household'
      ? (row.Household_Name ?? row.Display_Name)
      : row.Display_Name;

    if (row.Bulk_Mail_Opt_Out) {
      skipped.push({ name, contactId: row.Contact_ID, reason: 'opted_out' });
      continue;
    }

    if (!row.Address_Line_1) {
      skipped.push({ name, contactId: row.Contact_ID, reason: 'no_address' });
      continue;
    }

    if (!row.Postal_Code) {
      skipped.push({ name, contactId: row.Contact_ID, reason: 'no_postal_code' });
      continue;
    }

    if (!row.Bar_Code && !config.includeMissingBarcodes) {
      skipped.push({ name, contactId: row.Contact_ID, reason: 'no_barcode' });
      continue;
    }

    // Household dedup
    if (config.addressMode === 'household' && row.Household_ID) {
      if (seenHouseholds.has(row.Household_ID)) continue;
      seenHouseholds.add(row.Household_ID);
    }

    printable.push({
      name,
      addressLine1: row.Address_Line_1,
      addressLine2: row.Address_Line_2 ?? undefined,
      city: row.City ?? '',
      state: row['State/Region'] ?? '',
      postalCode: row.Postal_Code,
      barCode: row.Bar_Code ?? undefined,
      deliveryPointCode: row.Delivery_Point_Code ?? undefined,
    });
  }

  // Defensive sort by postal code
  printable.sort((a, b) => a.postalCode.localeCompare(b.postalCode));

  return { printable, skipped };
}

export async function fetchAddressLabels(
  params: ToolParams,
  config: LabelConfig
): Promise<FetchAddressLabelsResult> {
  const session = await getSession();

  const addressService = await AddressLabelService.getInstance();

  if (params.s && params.pageID) {
    // Selection mode — need MP User_ID for the selection stored proc
    const userId = await getMPUserId(session);
    const toolService = await ToolService.getInstance();
    const contactIds = await toolService.getSelectionRecordIds(params.s, userId, params.pageID);

    if (contactIds.length === 0) {
      return { printable: [], skipped: [] };
    }

    const rows = await addressService.getAddressesForContacts(contactIds);
    return filterAndTransform(rows, config);
  } else if (params.recordID && params.recordID !== -1) {
    // Single record mode
    const row = await addressService.getAddressForContact(params.recordID);
    if (!row) return { printable: [], skipped: [] };
    return filterAndTransform([row], config);
  }

  return { printable: [], skipped: [] };
}

/**
 * Build routing code from postal code + delivery point.
 * Returns 5, 9, or 11 digits (or empty string if invalid).
 */
function buildRoutingCode(postalCode?: string, deliveryPointCode?: string): string {
  const zip = postalCode?.replace(/-/g, '').trim() ?? '';
  if (!zip) return '';
  const dp = deliveryPointCode?.trim().padStart(2, '0') ?? '00';
  if (dp && dp !== '00') return zip + dp;
  return zip;
}

/**
 * Build a full 20-digit IMb tracking code from org settings.
 * Format: [Barcode ID: 2][Service Type: 3][Mailer ID: 6 or 9][Serial: 9 or 6]
 */
let imbSerialCounter = 0;
function buildImbTrackingCode(mailerId: string, serviceType: string): string {
  const barcodeId = '00';
  imbSerialCounter++;
  const serialLength = mailerId.length === 6 ? 9 : 6;
  const serial = String(imbSerialCounter).padStart(serialLength, '0');
  return barcodeId + serviceType + mailerId + serial;
}

export async function generateLabelPdf(
  labels: LabelData[],
  config: LabelConfig
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  await getSession();

  const stock = getLabelStock(config.stockId);
  if (!stock) {
    return { success: false, error: `Unknown label stock: ${config.stockId}` };
  }

  if (labels.length === 0) {
    return { success: false, error: 'No labels to print' };
  }

  try {
    // Reset serial counter for each print job
    imbSerialCounter = 0;

    // Pre-encode barcodes before passing to PDF renderer
    const labelsWithBars = labels.map((label) => {
      if (config.barcodeFormat === 'none') return label;

      const routingCode = buildRoutingCode(label.postalCode, label.deliveryPointCode);

      if (config.barcodeFormat === 'imb' && config.mailerId) {
        // Construct full IMb from org settings + routing data
        try {
          const trackingCode = buildImbTrackingCode(config.mailerId, config.serviceType);
          const imbInput = trackingCode + routingCode;
          const bars = imbEncode(imbInput);
          return { ...label, barStates: bars.join(''), barType: 'imb' as const };
        } catch {
          // Fall through to POSTNET
        }
      }

      if (config.barcodeFormat === 'postnet' || config.barcodeFormat === 'imb') {
        // POSTNET from routing data (also serves as IMb fallback)
        if (routingCode) {
          try {
            const bars = postnetEncode(routingCode);
            return { ...label, barStates: JSON.stringify(bars), barType: 'postnet' as const };
          } catch {
            // Try ZIP-only fallback
            try {
              const bars = postnetEncode(routingCode.substring(0, 5));
              return { ...label, barStates: JSON.stringify(bars), barType: 'postnet' as const };
            } catch {
              // No barcode possible
            }
          }
        }
      }

      return label;
    });

    const doc = React.createElement(LabelDocument, {
      labels: labelsWithBars,
      stock,
      startPosition: config.startPosition,
    });

    // pdf() expects ReactElement<DocumentProps> but our wrapper component has its own props.
    // LabelDocument renders <Document> at its root, so the cast is safe at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = pdf(doc as any);
    const blob = await instance.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return { success: true, data: base64 };
  } catch (error) {
    console.error('generateLabelPdf error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF generation failed',
    };
  }
}

export async function generateLabelDocx(
  labels: LabelData[],
  config: LabelConfig
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  await getSession();

  const stock = getLabelStock(config.stockId);
  if (!stock) {
    return { success: false, error: `Unknown label stock: ${config.stockId}` };
  }

  if (labels.length === 0) {
    return { success: false, error: 'No labels to export' };
  }

  try {
    imbSerialCounter = 0;

    // Pre-encode barcodes (same logic as PDF)
    const labelsWithBars = labels.map((label) => {
      if (config.barcodeFormat === 'none') return label;

      const routingCode = buildRoutingCode(label.postalCode, label.deliveryPointCode);

      if (config.barcodeFormat === 'imb' && config.mailerId) {
        try {
          const trackingCode = buildImbTrackingCode(config.mailerId, config.serviceType);
          const imbInput = trackingCode + routingCode;
          const bars = imbEncode(imbInput);
          return { ...label, barStates: bars.join(''), barType: 'imb' as const };
        } catch {
          // Fall through to POSTNET
        }
      }

      if (config.barcodeFormat === 'postnet' || config.barcodeFormat === 'imb') {
        if (routingCode) {
          try {
            const bars = postnetEncode(routingCode);
            return { ...label, barStates: JSON.stringify(bars), barType: 'postnet' as const };
          } catch {
            try {
              const bars = postnetEncode(routingCode.substring(0, 5));
              return { ...label, barStates: JSON.stringify(bars), barType: 'postnet' as const };
            } catch {
              // No barcode possible
            }
          }
        }
      }

      return label;
    });

    const doc = buildWordDocument(labelsWithBars, stock, config.startPosition);
    const buffer = await Packer.toBuffer(doc);
    const base64 = Buffer.from(buffer).toString('base64');

    return { success: true, data: base64 };
  } catch (error) {
    console.error('generateLabelDocx error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Word generation failed',
    };
  }
}
