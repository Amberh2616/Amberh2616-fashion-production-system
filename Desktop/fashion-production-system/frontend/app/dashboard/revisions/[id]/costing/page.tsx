"use client";

/**
 * Costing Page - Phase 2-2F
 * Display and manage Sample/Bulk costing for a revision
 */

import { use, useState } from 'react';
import { useCostSheets, useCostSheetDetail } from '@/lib/hooks/useCosting';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CostingSummaryCard } from '@/components/costing/CostingSummaryCard';
import { CostLinesTable } from '@/components/costing/CostLinesTable';
import { GenerateCostSheetDialog } from '@/components/costing/GenerateCostSheetDialog';
import type { CostingType } from '@/lib/types/costing';

interface CostingPageProps {
  params: Promise<{ id: string }>;
}

export default function CostingPage({ params }: CostingPageProps) {
  const { id: revisionId } = use(params);
  const [activeTab, setActiveTab] = useState<CostingType>('sample');

  // Fetch cost sheets for selected type
  const {
    data: costSheetsData,
    isLoading: loadingList,
    error: listError,
  } = useCostSheets(revisionId, {
    costing_type: activeTab,
    is_current: true,
  });

  // Get current version (first item with is_current=true)
  const currentCostSheet = costSheetsData?.results?.[0];

  // Fetch detail with lines
  const {
    data: costSheetDetail,
    isLoading: loadingDetail,
    error: detailError,
  } = useCostSheetDetail(currentCostSheet?.id ?? null);

  const isLoading = loadingList || loadingDetail;
  const error = listError || detailError;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Costing</h1>
          <p className="text-muted-foreground">
            Sample & Bulk costing for this revision
          </p>
        </div>
        <GenerateCostSheetDialog revisionId={revisionId} costingType={activeTab} />
      </div>

      {/* Costing Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CostingType)}>
        <TabsList>
          <TabsTrigger value="sample">Sample Costing</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Costing</TabsTrigger>
        </TabsList>

        <TabsContent value="sample" className="space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Failed to load costing data. Please try again.</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && !costSheetDetail && (
            <Card>
              <CardHeader>
                <CardTitle>No Sample Costing Found</CardTitle>
                <CardDescription>
                  Click "Generate New Version" to create your first sample costing.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {!isLoading && !error && costSheetDetail && (
            <>
              {/* Summary Card */}
              <CostingSummaryCard costSheet={costSheetDetail} />

              {/* Cost Lines Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                  <CardDescription>
                    Material costs (snapshot from BOM at generation time)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CostLinesTable lines={costSheetDetail.lines} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Failed to load costing data. Please try again.</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && !costSheetDetail && (
            <Card>
              <CardHeader>
                <CardTitle>No Bulk Costing Found</CardTitle>
                <CardDescription>
                  Click "Generate New Version" to create your first bulk costing (FOB pricing).
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {!isLoading && !error && costSheetDetail && (
            <>
              {/* Summary Card */}
              <CostingSummaryCard costSheet={costSheetDetail} />

              {/* Cost Lines Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                  <CardDescription>
                    Material costs (snapshot from BOM at generation time)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CostLinesTable lines={costSheetDetail.lines} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
