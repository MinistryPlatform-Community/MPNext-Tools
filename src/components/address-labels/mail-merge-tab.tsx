'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, Upload, FileText } from 'lucide-react';
import { AddressLabelsSummary } from './address-labels-summary';
import { generateSampleTemplate } from './sample-template';
import { mergeTemplate } from './actions';
import type { LabelData, SkipRecord, LabelConfig } from '@/lib/dto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface MailMergeTabProps {
  printable: LabelData[];
  skipped: SkipRecord[];
  config: LabelConfig;
}

function base64ToBlob(base64: string, type: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the data URL prefix (e.g., "data:application/...;base64,")
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function MailMergeTab({ printable, skipped, config }: MailMergeTabProps) {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateBase64, setTemplateBase64] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadSample = async () => {
    setIsDownloadingTemplate(true);
    setError(null);
    try {
      const base64 = await generateSampleTemplate();
      const blob = base64ToBlob(base64, DOCX_MIME);
      downloadBlob(blob, 'mail-merge-template.docx');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setTemplateFile(null);
      setTemplateBase64(null);
      return;
    }

    if (!file.name.endsWith('.docx')) {
      setError('Please select a .docx file');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Template file must be under 5MB');
      return;
    }

    setTemplateFile(file);
    try {
      const base64 = await fileToBase64(file);
      setTemplateBase64(base64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setTemplateFile(null);
      setTemplateBase64(null);
    }
  };

  const handleMerge = async () => {
    if (!templateBase64 || printable.length === 0) return;

    if (config.barcodeFormat === 'imb') {
      if (!config.mailerId || (config.mailerId.length !== 6 && config.mailerId.length !== 9)) {
        setError('IMb requires a 6 or 9 digit USPS Mailer ID');
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await mergeTemplate(templateBase64, printable, config);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const blob = base64ToBlob(result.data, DOCX_MIME);
      downloadBlob(blob, 'merged-letters.docx');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-md border p-4">
        <Label className="text-base font-medium">Template</Label>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            disabled={isDownloadingTemplate}
          >
            {isDownloadingTemplate ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Sample Template
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-upload">Upload your template (.docx, max 5MB)</Label>
          <Input
            id="template-upload"
            type="file"
            accept=".docx"
            onChange={handleFileChange}
          />
          {templateFile && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> {templateFile.name} ({(templateFile.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>
      </div>

      <AddressLabelsSummary printableCount={printable.length} skipped={skipped} />

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleMerge}
          disabled={!templateBase64 || printable.length === 0 || isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Merge & Download
        </Button>
      </div>
    </div>
  );
}
