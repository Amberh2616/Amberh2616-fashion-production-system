"use client";

/**
 * Sample Request Detail Page
 * Phase 3-1: Sample Request System MVP
 *
 * Displays:
 * - Request overview (brand, type, status, etc.)
 * - Run timeline (list of all runs)
 * - Actions (create new run, update request status)
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useSampleRequest,
  useSampleRuns,
  useCreateSampleRun,
  useUpdateSampleRequest,
  useSubmitSampleRun,
  useStartExecutionSampleRun,
  useCompleteSampleRun,
  useCancelSampleRun,
} from '@/lib/hooks/useSamples';
import type { CreateSampleRunPayload, UpdateSampleRequestPayload } from '@/types/samples';
import {
  SampleRequestTypeLabels,
  SampleRequestStatusLabels,
  PriorityLabels,
} from '@/types/samples';
import { SampleRunTimeline } from '@/components/samples/SampleRunTimeline';
import { SampleRunCard } from '@/components/samples/SampleRunCard';
import { CreateSampleRunDialog } from '@/components/samples/CreateSampleRunDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, Plus, Calendar, Package, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function SampleRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;

  const [isCreateRunDialogOpen, setIsCreateRunDialogOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isRunSheetOpen, setIsRunSheetOpen] = useState(false);

  // Fetch request and runs
  const { data: request, isLoading: isLoadingRequest, error: requestError } = useSampleRequest(requestId);
  const { data: runs = [], isLoading: isLoadingRuns } = useSampleRuns({ sample_request_id: requestId });

  // Mutations
  const createRunMutation = useCreateSampleRun(requestId);
  const updateRequestMutation = useUpdateSampleRequest();
  const submitRunMutation = useSubmitSampleRun(requestId);
  const startExecutionMutation = useStartExecutionSampleRun(requestId);
  const completeRunMutation = useCompleteSampleRun(requestId);
  const cancelRunMutation = useCancelSampleRun(requestId);

  // Loading state
  if (isLoadingRequest) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-muted-foreground">Loading sample request...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (requestError || !request) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/samples">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Failed to load sample request
          </h2>
          <p className="text-red-600">
            {requestError instanceof Error ? requestError.message : 'Request not found'}
          </p>
        </div>
      </div>
    );
  }

  // Handle run creation
  const handleCreateRun = async (payload: CreateSampleRunPayload) => {
    try {
      await createRunMutation.mutateAsync(payload);
      setIsCreateRunDialogOpen(false);
    } catch (err) {
      console.error('Failed to create run:', err);
    }
  };

  // Handle run click
  const handleRunClick = (run: any) => {
    setSelectedRunId(run.id);
    setIsRunSheetOpen(true);
  };

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateRequestMutation.mutateAsync({
        id: requestId,
        payload: { status: newStatus as any },
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Handle run action
  const handleRunAction = async (action: string) => {
    if (!selectedRunId) return;

    try {
      switch (action) {
        case 'submit':
          await submitRunMutation.mutateAsync({ id: selectedRunId });
          break;
        case 'start_execution':
          await startExecutionMutation.mutateAsync({ id: selectedRunId });
          break;
        case 'complete':
          await completeRunMutation.mutateAsync({ id: selectedRunId });
          break;
        case 'cancel':
          await cancelRunMutation.mutateAsync({ id: selectedRunId });
          break;
      }
      // Refresh selected run
      setIsRunSheetOpen(false);
      setSelectedRunId(null);
    } catch (err) {
      console.error('Failed to execute action:', err);
    }
  };

  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const isActionLoading =
    submitRunMutation.isPending ||
    startExecutionMutation.isPending ||
    completeRunMutation.isPending ||
    cancelRunMutation.isPending;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/samples">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        </Link>

        <div className="flex-1">
          <h1 className="text-3xl font-bold">Sample Request Detail</h1>
          <p className="text-muted-foreground mt-1">
            {SampleRequestTypeLabels[request.request_type]} - {request.brand_name || 'N/A'}
          </p>
        </div>

        <Button onClick={() => setIsCreateRunDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Run
        </Button>
      </div>

      {/* Request Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Request Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <div className="text-sm font-medium mb-1">Status</div>
              <Select
                value={request.status}
                onValueChange={handleStatusChange}
                disabled={updateRequestMutation.isPending}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Priority</div>
              <Badge
                variant={
                  request.priority === 'urgent'
                    ? 'destructive'
                    : request.priority === 'normal'
                      ? 'default'
                      : 'secondary'
                }
              >
                {PriorityLabels[request.priority]}
              </Badge>
            </div>

            {request.need_quote_first && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>Requires Quote Approval</span>
              </div>
            )}
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Brand</div>
              <div className="text-sm mt-1">{request.brand_name || 'N/A'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <div className="text-sm mt-1">
                {SampleRequestTypeLabels[request.request_type]}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Quantity</div>
              <div className="text-sm mt-1 flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                {request.quantity_requested} pcs
              </div>
            </div>

            {request.due_date && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Due Date</div>
                <div className="text-sm mt-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(request.due_date), 'MMM dd, yyyy')}
                </div>
              </div>
            )}
          </div>

          {/* Purpose */}
          {request.purpose && (
            <div className="pt-4 border-t">
              <div className="text-sm font-medium text-muted-foreground mb-2">Purpose</div>
              <p className="text-sm">{request.purpose}</p>
            </div>
          )}

          {/* Notes */}
          {(request.notes_internal || request.notes_customer) && (
            <div className="pt-4 border-t space-y-3">
              {request.notes_internal && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Internal Notes
                  </div>
                  <p className="text-sm text-muted-foreground">{request.notes_internal}</p>
                </div>
              )}
              {request.notes_customer && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Customer Notes
                  </div>
                  <p className="text-sm text-muted-foreground">{request.notes_customer}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Runs Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Sample Runs</h2>
          {isLoadingRuns && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <SampleRunTimeline runs={runs} onRunClick={handleRunClick} />
      </div>

      {/* Create Run Dialog */}
      <CreateSampleRunDialog
        open={isCreateRunDialogOpen}
        onOpenChange={setIsCreateRunDialogOpen}
        sampleRequestId={requestId}
        onCreate={handleCreateRun}
        isCreating={createRunMutation.isPending}
      />

      {/* Run Detail Sheet */}
      <Sheet open={isRunSheetOpen} onOpenChange={setIsRunSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Run Details</SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            {selectedRun && (
              <SampleRunCard
                run={selectedRun}
                onActionClick={handleRunAction}
                isActionLoading={isActionLoading}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
