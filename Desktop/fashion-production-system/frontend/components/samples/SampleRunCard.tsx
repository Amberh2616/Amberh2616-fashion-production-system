"use client";

/**
 * SampleRunCard Component
 * Detailed card view for a single run
 */

import { SampleRun } from '@/types/samples';
import { SampleRunTypeLabels, SampleRunStatusLabels } from '@/types/samples';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Calendar,
  Package,
  FileText,
  TrendingUp,
  Play,
  Check,
  X,
  Loader2,
} from 'lucide-react';

interface SampleRunCardProps {
  run: SampleRun;
  onActionClick?: (action: string) => void;
  isActionLoading?: boolean;
}

export function SampleRunCard({ run, onActionClick, isActionLoading }: SampleRunCardProps) {
  // Available actions based on status (simplified - actual logic in backend)
  const getAvailableActions = () => {
    const actions: { label: string; action: string; variant?: any }[] = [];

    if (run.status === 'draft') {
      actions.push({ label: 'Submit', action: 'submit' });
    }
    if (run.status === 'materials_planning') {
      actions.push({ label: 'Start Execution', action: 'start_execution', variant: 'default' });
    }
    if (run.status === 'in_progress') {
      actions.push({ label: 'Complete', action: 'complete', variant: 'default' });
    }
    if (['draft', 'materials_planning'].includes(run.status)) {
      actions.push({ label: 'Cancel', action: 'cancel', variant: 'destructive' });
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">
              Run #{run.run_no} - {SampleRunTypeLabels[run.run_type]}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Created {format(new Date(run.created_at), 'MMM dd, yyyy')}
            </p>
          </div>

          <Badge
            variant={
              run.status === 'accepted'
                ? 'default'
                : run.status === 'cancelled' || run.status === 'revise_needed'
                  ? 'destructive'
                  : run.status === 'draft'
                    ? 'secondary'
                    : 'outline'
            }
          >
            {SampleRunStatusLabels[run.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Quantity</div>
              <div className="text-sm text-muted-foreground">{run.quantity} pcs</div>
            </div>
          </div>

          {run.target_due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Target Due Date</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(run.target_due_date), 'MMM dd, yyyy')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {run.notes && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Notes</div>
            </div>
            <p className="text-sm text-muted-foreground pl-6">{run.notes}</p>
          </div>
        )}

        {/* Linked Resources */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-3">Linked Resources</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {run.guidance_usage && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Guidance Usage: {run.guidance_usage.slice(0, 8)}...</span>
              </div>
            )}
            {run.actual_usage && (
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Actual Usage: {run.actual_usage.slice(0, 8)}...</span>
              </div>
            )}
            {run.costing_version && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Costing Version: {run.costing_version.slice(0, 8)}...</span>
              </div>
            )}
            {run.t2pos && run.t2pos.length > 0 && (
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>T2 POs: {run.t2pos.length}</span>
              </div>
            )}
            {run.mwos && run.mwos.length > 0 && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>MWOs: {run.mwos.length}</span>
              </div>
            )}
            {!run.guidance_usage &&
              !run.actual_usage &&
              !run.costing_version &&
              (!run.t2pos || run.t2pos.length === 0) &&
              (!run.mwos || run.mwos.length === 0) && (
                <div className="text-muted-foreground italic">No linked resources yet</div>
              )}
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              {actions.map((action) => (
                <Button
                  key={action.action}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => onActionClick?.(action.action)}
                  disabled={isActionLoading}
                >
                  {isActionLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {action.action === 'submit' && <Play className="mr-2 h-3.5 w-3.5" />}
                  {action.action === 'complete' && <Check className="mr-2 h-3.5 w-3.5" />}
                  {action.action === 'cancel' && <X className="mr-2 h-3.5 w-3.5" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
