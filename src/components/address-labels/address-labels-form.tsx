'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LABEL_STOCKS } from '@/lib/label-stock';
import { SERVICE_TYPES } from '@/lib/dto';
import type { AddressMode, BarcodeFormat, LabelConfig } from '@/lib/dto';

interface AddressLabelsFormProps {
  config: LabelConfig;
  onChange: (config: LabelConfig) => void;
  maxStartPosition: number;
}

export function AddressLabelsForm({ config, onChange, maxStartPosition }: AddressLabelsFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stock">Label Stock</Label>
          <Select
            value={config.stockId}
            onValueChange={(value) => onChange({ ...config, stockId: value, startPosition: 1 })}
          >
            <SelectTrigger id="stock">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LABEL_STOCKS.map((stock) => (
                <SelectItem key={stock.id} value={stock.id}>
                  {stock.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startPos">Start Position</Label>
          <Input
            id="startPos"
            type="number"
            min={1}
            max={maxStartPosition}
            value={config.startPosition}
            onChange={(e) =>
              onChange({
                ...config,
                startPosition: Math.max(1, Math.min(maxStartPosition, parseInt(e.target.value) || 1)),
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address Mode</Label>
        <RadioGroup
          value={config.addressMode}
          onValueChange={(value) => onChange({ ...config, addressMode: value as AddressMode })}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="household" id="household" />
            <Label htmlFor="household" className="font-normal">Household</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="individual" id="individual" />
            <Label htmlFor="individual" className="font-normal">Individual</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Barcode Type</Label>
        <RadioGroup
          value={config.barcodeFormat}
          onValueChange={(value) => onChange({ ...config, barcodeFormat: value as BarcodeFormat })}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="imb" id="bc-imb" />
            <Label htmlFor="bc-imb" className="font-normal">Intelligent Mail (IMb)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="postnet" id="bc-postnet" />
            <Label htmlFor="bc-postnet" className="font-normal">POSTNET</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="none" id="bc-none" />
            <Label htmlFor="bc-none" className="font-normal">None</Label>
          </div>
        </RadioGroup>
      </div>

      {config.barcodeFormat === 'imb' && (
        <div className="grid grid-cols-2 gap-4 rounded-md border p-3 bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="mailerId">USPS Mailer ID</Label>
            <Input
              id="mailerId"
              type="text"
              placeholder="6 or 9 digits"
              value={config.mailerId}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                onChange({ ...config, mailerId: val });
              }}
            />
            {config.mailerId && config.mailerId.length !== 6 && config.mailerId.length !== 9 && (
              <p className="text-xs text-amber-600">Must be 6 or 9 digits</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select
              value={config.serviceType}
              onValueChange={(value) => onChange({ ...config, serviceType: value })}
            >
              <SelectTrigger id="serviceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id="includeMissingBarcodes"
          checked={config.includeMissingBarcodes}
          onCheckedChange={(checked) =>
            onChange({ ...config, includeMissingBarcodes: checked === true })
          }
        />
        <Label htmlFor="includeMissingBarcodes" className="font-normal">
          Include labels without barcodes
        </Label>
      </div>
    </div>
  );
}
