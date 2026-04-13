'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LABEL_STOCKS } from '@/lib/label-stock';
import type { AddressMode, LabelConfig } from '@/lib/dto';

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
