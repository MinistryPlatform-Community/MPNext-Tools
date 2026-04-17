'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ToolContainer } from '@/components/tool';
import { AddressLabelsForm, AddressLabelsSummary } from '@/components/address-labels';
import { MailMergeTab } from '@/components/address-labels/mail-merge-tab';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, FileDown } from 'lucide-react';
import { getLabelStock } from '@/lib/label-stock';
import { fetchAddressLabels, generateLabelPdf, generateLabelDocx } from '@/components/address-labels/actions';
import type { ToolParams } from '@/lib/tool-params';
import type { LabelData, SkipRecord, LabelConfig } from '@/lib/dto';

const STORAGE_KEY = 'address-labels-config';

function loadSavedConfig(): Partial<LabelConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function saveConfig(config: LabelConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable
  }
}

interface AddressLabelsProps {
  params: ToolParams;
}

export function AddressLabels({ params }: AddressLabelsProps) {
  const router = useRouter();

  const [config, setConfig] = useState<LabelConfig>(() => {
    const saved = loadSavedConfig();
    return {
      stockId: saved.stockId ?? '5160',
      addressMode: saved.addressMode ?? 'household',
      startPosition: saved.startPosition ?? 1,
      includeMissingBarcodes: saved.includeMissingBarcodes ?? true,
      barcodeFormat: saved.barcodeFormat ?? 'postnet',
      mailerId: saved.mailerId ?? '',
      serviceType: saved.serviceType ?? '040',
    };
  });

  const [printable, setPrintable] = useState<LabelData[]>([]);
  const [skipped, setSkipped] = useState<SkipRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'labels' | 'merge'>('labels');

  const stock = getLabelStock(config.stockId);
  const maxStartPosition = stock ? stock.columns * stock.rows : 30;

  // Persist config to localStorage on change
  const handleConfigChange = useCallback((newConfig: LabelConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  }, []);

  // Only re-fetch when filtering-relevant config changes (mode, barcode toggle),
  // NOT when layout-only config changes (stock, start position, barcode format)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAddressLabels(params, config);
      setPrintable(result.printable);
      setSkipped(result.skipped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load address data');
    } finally {
      setIsLoading(false);
    }
  }, [params, config.addressMode, config.includeMissingBarcodes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (printable.length === 0) return;

    // Validate IMb config
    if (config.barcodeFormat === 'imb') {
      if (!config.mailerId || (config.mailerId.length !== 6 && config.mailerId.length !== 9)) {
        setError('IMb requires a 6 or 9 digit USPS Mailer ID');
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateLabelPdf(printable, config);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Convert base64 to blob and open in new tab
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadWord = async () => {
    if (printable.length === 0) return;

    if (config.barcodeFormat === 'imb') {
      if (!config.mailerId || (config.mailerId.length !== 6 && config.mailerId.length !== 9)) {
        setError('IMb requires a 6 or 9 digit USPS Mailer ID');
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateLabelDocx(printable, config);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'address-labels.docx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Word generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <ToolContainer
      params={params}
      title="Address Labels"
      onClose={handleClose}
      hideFooter
    >
      <div className="px-6 py-4 space-y-6 max-w-2xl">
        <AddressLabelsForm
          config={config}
          onChange={handleConfigChange}
          maxStartPosition={maxStartPosition}
        />

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading address data...
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="flex border-b">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'labels'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('labels')}
              >
                Labels
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'merge'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('merge')}
              >
                Mail Merge
              </button>
            </div>

            {activeTab === 'labels' ? (
              <>
                <AddressLabelsSummary
                  printableCount={printable.length}
                  skipped={skipped}
                />

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerate}
                    disabled={printable.length === 0 || isGenerating}
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate PDF
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleDownloadWord}
                    disabled={printable.length === 0 || isGenerating}
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                    Download Word
                  </Button>
                  <Button variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <MailMergeTab
                printable={printable}
                skipped={skipped}
                config={config}
              />
            )}
          </>
        )}
      </div>
    </ToolContainer>
  );
}
