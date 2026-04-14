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
import { preEncodeBarcodes } from '@/lib/barcode-helpers';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import ImageModule from 'docxtemplater-image-module-free';
import { imbBarcodeToBmp, postnetBarcodeToBmp } from '@/lib/barcode-image';

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
    const labelsWithBars = preEncodeBarcodes(labels, config);

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
    const labelsWithBars = preEncodeBarcodes(labels, config);

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

const MAX_TEMPLATE_SIZE = 5 * 1024 * 1024; // 5MB

export async function mergeTemplate(
  templateBase64: string,
  labels: LabelData[],
  config: LabelConfig
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  await getSession();

  if (labels.length === 0) {
    return { success: false, error: 'No addresses to merge' };
  }

  // Validate template size
  const templateSize = Math.ceil(templateBase64.length * 0.75);
  if (templateSize > MAX_TEMPLATE_SIZE) {
    return { success: false, error: 'Template file exceeds 5MB limit' };
  }

  try {
    const labelsWithBars = preEncodeBarcodes(labels, config);

    // Build barcode image map — the image module resolves string keys via getImage,
    // not Buffer objects directly (which it misinterprets as cached results)
    const barcodeMap = new Map<string, Buffer>();
    const addresses = labelsWithBars.map((label, i) => {
      let barcodeKey = '';
      if (label.barStates && label.barType) {
        const buf = label.barType === 'imb'
          ? imbBarcodeToBmp(label.barStates, 300, 40)
          : postnetBarcodeToBmp(label.barStates, 300, 30);
        barcodeKey = `barcode_${i}`;
        barcodeMap.set(barcodeKey, buf);
      }

      return {
        Name: label.name,
        AddressLine1: label.addressLine1,
        AddressLine2: label.addressLine2 || '',
        City: label.city,
        State: label.state,
        PostalCode: label.postalCode,
        Barcode: barcodeKey,
        isNotLast: i < labelsWithBars.length - 1,
      };
    });

    // Parse template
    const templateBuffer = Buffer.from(templateBase64, 'base64');
    const zip = new PizZip(templateBuffer);

    // Configure image module
    const imageModule = new ImageModule({
      centered: false,
      getImage: (tagValue: unknown) => {
        const buf = barcodeMap.get(tagValue as string);
        return buf || Buffer.alloc(0);
      },
      getSize: (_img: Buffer | string, _tagValue: unknown, tagName: string) => {
        if (tagName === 'Barcode') return [200, 25] as [number, number];
        return [100, 100] as [number, number];
      },
    });

    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render({ addresses });

    const output = doc.getZip().generate({ type: 'nodebuffer' });
    const base64 = Buffer.from(output).toString('base64');

    return { success: true, data: base64 };
  } catch (error) {
    console.error('mergeTemplate error:', error);
    const message = error instanceof Error ? error.message : 'Template merge failed';
    if (message.includes('tag')) {
      return { success: false, error: `Template error: ${message}. Check that merge tokens are correctly formatted.` };
    }
    return { success: false, error: message };
  }
}
