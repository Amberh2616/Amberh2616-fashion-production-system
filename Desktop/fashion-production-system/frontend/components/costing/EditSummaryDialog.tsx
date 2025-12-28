"use client";

/**
 * Edit Summary Dialog - Phase 2-2I: Version Policy
 * Smart button switching based on A/B field classification
 */

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useUpdateCostSheet, useDuplicateCostSheet } from '@/lib/hooks/useCosting';
import type { CostSheetDetail } from '@/lib/types/costing';

interface EditSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costSheet: CostSheetDetail;
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

// A/B Field Classification (Version Policy)
const A_FIELDS = new Set([
  'labor_cost',
  'overhead_cost',
  'freight_cost',
  'packaging_cost',
  'testing_cost',
  'notes',
]);

const B_FIELDS = new Set(['margin_pct', 'wastage_pct']);

export function EditSummaryDialog({
  open,
  onOpenChange,
  costSheet,
}: EditSummaryDialogProps) {
  const { mutate: updateCostSheet, isPending: isUpdating } = useUpdateCostSheet(costSheet.id);
  const { mutate: duplicateCostSheet, isPending: isDuplicating } = useDuplicateCostSheet(
    costSheet.id,
    costSheet.revision
  );

  const { register, handleSubmit, reset, watch } = useForm<FormData>({
    defaultValues: {
      labor_cost: costSheet.labor_cost,
      overhead_cost: costSheet.overhead_cost,
      freight_cost: costSheet.freight_cost,
      packaging_cost: costSheet.packaging_cost,
      testing_cost: costSheet.testing_cost,
      margin_pct: costSheet.margin_pct,
      wastage_pct: costSheet.wastage_pct,
      notes: costSheet.notes,
    },
  });

  // Watch all form fields
  const formValues = watch();

  // Reset form when costSheet changes
  useEffect(() => {
    reset({
      labor_cost: costSheet.labor_cost,
      overhead_cost: costSheet.overhead_cost,
      freight_cost: costSheet.freight_cost,
      packaging_cost: costSheet.packaging_cost,
      testing_cost: costSheet.testing_cost,
      margin_pct: costSheet.margin_pct,
      wastage_pct: costSheet.wastage_pct,
      notes: costSheet.notes,
    });
  }, [costSheet, reset]);

  // Detect dirty fields (智能按鈕核心邏輯)
  const dirtyFields = useMemo(() => {
    const dirty: string[] = [];
    Object.keys(formValues).forEach((key) => {
      const formValue = formValues[key as keyof FormData];
      const originalValue = costSheet[key as keyof CostSheetDetail];
      if (formValue !== originalValue) {
        dirty.push(key);
      }
    });
    return dirty;
  }, [formValues, costSheet]);

  // Check if B-fields are modified (需要新版本)
  const hasBFieldChanges = useMemo(() => {
    return dirtyFields.some((field) => B_FIELDS.has(field));
  }, [dirtyFields]);

  // Determine button action
  const buttonAction = hasBFieldChanges ? 'create_version' : 'update';
  const isPending = isUpdating || isDuplicating;

  const onSubmit = (data: FormData) => {
    if (hasBFieldChanges) {
      // B-fields changed → Create new version via Duplicate API
      duplicateCostSheet(
        {
          margin_pct: data.margin_pct,
          wastage_pct: data.wastage_pct,
          notes: data.notes || '',
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      // Only A-fields changed → Update same version via PATCH
      const payload: Record<string, string> = {};
      dirtyFields.forEach((field) => {
        if (A_FIELDS.has(field)) {
          payload[field] = data[field as keyof FormData];
        }
      });

      updateCostSheet(payload, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Summary</DialogTitle>
            <DialogDescription>
              Update cost inputs and pricing parameters. Totals will be recalculated
              automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Version Policy Warning */}
          {hasBFieldChanges && (
            <Alert className="mt-4 border-amber-500 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>New Version Required:</strong> You've modified margin or wastage.
                Clicking "Save as New Version" will create version{' '}
                <strong>v{costSheet.version_no + 1}</strong> with these pricing changes.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Labor Cost */}
            <div className="space-y-2">
              <Label htmlFor="edit_labor_cost">Labor Cost (per unit)</Label>
              <Input
                id="edit_labor_cost"
                type="number"
                step="0.01"
                {...register('labor_cost')}
              />
            </div>

            {/* Overhead Cost */}
            <div className="space-y-2">
              <Label htmlFor="edit_overhead_cost">Overhead Cost</Label>
              <Input
                id="edit_overhead_cost"
                type="number"
                step="0.01"
                {...register('overhead_cost')}
              />
            </div>

            {/* Freight Cost */}
            <div className="space-y-2">
              <Label htmlFor="edit_freight_cost">Freight Cost</Label>
              <Input
                id="edit_freight_cost"
                type="number"
                step="0.01"
                {...register('freight_cost')}
              />
            </div>

            {/* Packaging Cost */}
            <div className="space-y-2">
              <Label htmlFor="edit_packaging_cost">Packaging Cost</Label>
              <Input
                id="edit_packaging_cost"
                type="number"
                step="0.01"
                {...register('packaging_cost')}
              />
            </div>

            {/* Testing Cost */}
            <div className="space-y-2">
              <Label htmlFor="edit_testing_cost">Testing Cost</Label>
              <Input
                id="edit_testing_cost"
                type="number"
                step="0.01"
                {...register('testing_cost')}
              />
            </div>

            {/* Margin % */}
            <div className="space-y-2">
              <Label htmlFor="edit_margin_pct">
                Margin % {hasBFieldChanges && <span className="text-amber-600">*</span>}
              </Label>
              <Input
                id="edit_margin_pct"
                type="number"
                step="0.01"
                {...register('margin_pct')}
                className={hasBFieldChanges ? 'border-amber-500' : ''}
              />
            </div>

            {/* Wastage % */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit_wastage_pct">
                Wastage % {hasBFieldChanges && <span className="text-amber-600">*</span>}
              </Label>
              <Input
                id="edit_wastage_pct"
                type="number"
                step="0.01"
                {...register('wastage_pct')}
                className={hasBFieldChanges ? 'border-amber-500' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Changing wastage will create a new version and recalculate all line costs
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                placeholder="Add notes about this update..."
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>

            {/* Smart Button: 根據髒欄位切換 */}
            {buttonAction === 'create_version' ? (
              <Button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save as New Version (v{costSheet.version_no + 1})
              </Button>
            ) : (
              <Button type="submit" disabled={isPending || dirtyFields.length === 0}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
