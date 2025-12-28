"use client";

/**
 * Costing Summary Card
 * Display and edit cost summary (labor, overhead, margin, etc.)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Loader2, CheckCircle2 } from 'lucide-react';
import { EditSummaryDialog } from './EditSummaryDialog';
import type { CostSheetDetail } from '@/lib/types/costing';

interface CostingSummaryCardProps {
  costSheet: CostSheetDetail;
}

export function CostingSummaryCard({ costSheet }: CostingSummaryCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const formatCurrency = (value: string) => {
    return `$${parseFloat(value).toFixed(2)}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {costSheet.costing_type_display} - Version {costSheet.version_no}
                {costSheet.is_current && (
                  <Badge variant="default">Current</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Created {new Date(costSheet.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Summary
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Material Cost */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Material Cost</p>
              <p className="text-2xl font-bold">{formatCurrency(costSheet.material_cost)}</p>
              <p className="text-xs text-muted-foreground">
                From {costSheet.lines.length} BOM items
              </p>
            </div>

            {/* Labor Cost */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Labor Cost</p>
              <p className="text-xl font-semibold">{formatCurrency(costSheet.labor_cost)}</p>
            </div>

            {/* Overhead Cost */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Overhead Cost</p>
              <p className="text-xl font-semibold">{formatCurrency(costSheet.overhead_cost)}</p>
            </div>

            {/* Freight Cost */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Freight Cost</p>
              <p className="text-xl font-semibold">{formatCurrency(costSheet.freight_cost)}</p>
            </div>

            {/* Packaging Cost */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Packaging Cost</p>
              <p className="text-xl font-semibold">{formatCurrency(costSheet.packaging_cost)}</p>
            </div>

            {/* Testing Cost */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Testing Cost</p>
              <p className="text-xl font-semibold">{formatCurrency(costSheet.testing_cost)}</p>
            </div>

            {/* Total COGS */}
            <div className="space-y-1 md:col-span-2 lg:col-span-1">
              <p className="text-sm text-muted-foreground">Total COGS</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(costSheet.total_cost)}
              </p>
            </div>

            {/* Margin % */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Margin %</p>
              <p className="text-xl font-semibold">{costSheet.margin_pct}%</p>
            </div>

            {/* Wastage % */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Wastage %</p>
              <p className="text-xl font-semibold">{costSheet.wastage_pct}%</p>
            </div>
          </div>

          {/* Unit Price - Big Display */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {costSheet.costing_type === 'sample' ? 'Sample Unit Price' : 'FOB Price'}
                </p>
                <p className="text-4xl font-bold text-green-600">
                  {formatCurrency(costSheet.unit_price)}
                </p>
              </div>
              {costSheet.notes && (
                <div className="text-sm text-muted-foreground max-w-md">
                  <p className="font-medium">Notes:</p>
                  <p>{costSheet.notes}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditSummaryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        costSheet={costSheet}
      />
    </>
  );
}
