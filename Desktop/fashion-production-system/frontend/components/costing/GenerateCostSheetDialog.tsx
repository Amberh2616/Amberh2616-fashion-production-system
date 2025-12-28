"use client";

/**
 * Generate CostSheet Dialog
 * Create new costing version from current BOM
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { useGenerateCostSheet } from '@/lib/hooks/useCosting';
import type { GenerateCostSheetPayload, CostingType } from '@/lib/types/costing';

interface GenerateCostSheetDialogProps {
  revisionId: string;
  costingType: CostingType;
}

interface FormData {
  labor_cost: string;
  overhead_cost: string;
  freight_cost: string;
  packaging_cost: string;
  testing_cost: string;
  margin_pct: string;
  wastage_pct: string;
  notes: string;
}

export function GenerateCostSheetDialog({
  revisionId,
  costingType,
}: GenerateCostSheetDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: generateCostSheet, isPending } = useGenerateCostSheet(revisionId);

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      labor_cost: costingType === 'sample' ? '15.00' : '12.00',
      overhead_cost: '5.00',
      freight_cost: '2.50',
      packaging_cost: '1.00',
      testing_cost: '0.50',
      margin_pct: '30.00',
      wastage_pct: '5.00',
      notes: '',
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: GenerateCostSheetPayload = {
      costing_type: costingType,
      ...data,
    };

    generateCostSheet(payload, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Generate New Version
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              Generate {costingType === 'sample' ? 'Sample' : 'Bulk'} Costing
            </DialogTitle>
            <DialogDescription>
              Create a new costing version from current BOM. This will snapshot all BOM
              items and calculate costs.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Labor Cost */}
            <div className="space-y-2">
              <Label htmlFor="labor_cost">Labor Cost (per unit)</Label>
              <Input
                id="labor_cost"
                type="number"
                step="0.01"
                {...register('labor_cost')}
              />
            </div>

            {/* Overhead Cost */}
            <div className="space-y-2">
              <Label htmlFor="overhead_cost">Overhead Cost</Label>
              <Input
                id="overhead_cost"
                type="number"
                step="0.01"
                {...register('overhead_cost')}
              />
            </div>

            {/* Freight Cost */}
            <div className="space-y-2">
              <Label htmlFor="freight_cost">Freight Cost</Label>
              <Input
                id="freight_cost"
                type="number"
                step="0.01"
                {...register('freight_cost')}
              />
            </div>

            {/* Packaging Cost */}
            <div className="space-y-2">
              <Label htmlFor="packaging_cost">Packaging Cost</Label>
              <Input
                id="packaging_cost"
                type="number"
                step="0.01"
                {...register('packaging_cost')}
              />
            </div>

            {/* Testing Cost */}
            <div className="space-y-2">
              <Label htmlFor="testing_cost">Testing Cost</Label>
              <Input
                id="testing_cost"
                type="number"
                step="0.01"
                {...register('testing_cost')}
              />
            </div>

            {/* Margin % */}
            <div className="space-y-2">
              <Label htmlFor="margin_pct">Margin %</Label>
              <Input
                id="margin_pct"
                type="number"
                step="0.01"
                {...register('margin_pct')}
              />
            </div>

            {/* Wastage % */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="wastage_pct">Wastage % (applied to all materials)</Label>
              <Input
                id="wastage_pct"
                type="number"
                step="0.01"
                {...register('wastage_pct')}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g., Updated pricing from supplier..."
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
