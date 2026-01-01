/**
 * Progress Tab Component
 * Production tracking and status update controls
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SampleRun, SampleRunStatusLabels } from '@/types/samples';
import { PlayCircle, CheckCircle, AlertCircle, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';

interface ProgressTabProps {
  run: SampleRun;
}

export function ProgressTab({ run }: ProgressTabProps) {
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // Check if actions are available
  const canStartProduction =
    run.status === 'mwo_issued' || run.status === 'po_issued';
  const canMarkDone = run.status === 'in_progress';

  // Handle start production
  const handleStartProduction = async () => {
    // TODO: Call API to start production
    console.log('Start production for run:', run.id, 'Notes:', notes);
    setIsStartDialogOpen(false);
    setNotes('');
  };

  // Handle mark sample done
  const handleMarkSampleDone = async () => {
    // TODO: Call API to mark sample done
    console.log('Mark sample done for run:', run.id, 'Notes:', notes);
    setIsCompleteDialogOpen(false);
    setNotes('');
  };

  // Get progress percentage based on status
  const getProgressPercentage = (status: string) => {
    const progressMap: Record<string, number> = {
      draft: 0,
      materials_planning: 10,
      po_drafted: 20,
      po_issued: 30,
      mwo_drafted: 40,
      mwo_issued: 50,
      in_progress: 75,
      sample_done: 100,
      actuals_recorded: 100,
      costing_generated: 100,
      quoted: 100,
      accepted: 100,
      revise_needed: 50,
      cancelled: 0,
    };
    return progressMap[status] || 0;
  };

  const progress = getProgressPercentage(run.status);

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Production Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge and Info */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {run.status === 'in_progress' ? (
                <Clock className="h-12 w-12 text-blue-500" />
              ) : run.status === 'sample_done' ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : run.status === 'cancelled' ? (
                <AlertCircle className="h-12 w-12 text-red-500" />
              ) : (
                <Package className="h-12 w-12 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <Badge className="mb-2">{SampleRunStatusLabels[run.status]}</Badge>
              <div className="text-sm text-muted-foreground">
                Last updated: {format(new Date(run.status_updated_at), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Production Progress</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  run.status === 'cancelled'
                    ? 'bg-red-500'
                    : run.status === 'sample_done'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3 pt-4">
            <div className="text-sm font-medium">Production Timeline</div>
            <div className="space-y-2">
              <TimelineItem
                label="Materials Issued"
                completed={progress >= 30}
                timestamp={run.created_at}
              />
              <TimelineItem
                label="MWO Issued"
                completed={progress >= 50}
                timestamp={run.status === 'mwo_issued' ? run.status_updated_at : undefined}
              />
              <TimelineItem
                label="Production Started"
                completed={progress >= 75}
                timestamp={run.status === 'in_progress' ? run.status_updated_at : undefined}
              />
              <TimelineItem
                label="Sample Completed"
                completed={progress >= 100}
                timestamp={run.status === 'sample_done' ? run.status_updated_at : undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons Card */}
      <Card>
        <CardHeader>
          <CardTitle>Production Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Start Production */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="font-medium">Start Production</div>
              <div className="text-sm text-muted-foreground mt-1">
                Mark that production has started in the factory
              </div>
            </div>
            <Button
              onClick={() => setIsStartDialogOpen(true)}
              disabled={!canStartProduction}
              className="ml-4"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Start Production
            </Button>
          </div>

          {/* Mark Sample Done */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="font-medium">Mark Sample Done</div>
              <div className="text-sm text-muted-foreground mt-1">
                Confirm that sample production is complete
              </div>
            </div>
            <Button
              onClick={() => setIsCompleteDialogOpen(true)}
              disabled={!canMarkDone}
              className="ml-4"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Done
            </Button>
          </div>

          {/* Status Info */}
          {!canStartProduction && !canMarkDone && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {run.status === 'draft' && 'Complete materials and MWO planning first.'}
                {run.status === 'materials_planning' && 'Issue T2PO to proceed.'}
                {run.status === 'po_drafted' && 'Issue the T2PO to proceed.'}
                {run.status === 'mwo_drafted' && 'Issue the MWO to proceed.'}
                {run.status === 'sample_done' && 'Sample is complete. Record actuals next.'}
                {run.status === 'actuals_recorded' && 'All production steps completed.'}
                {run.status === 'cancelled' && 'This run has been cancelled.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Start Production Dialog */}
      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Production</DialogTitle>
            <DialogDescription>
              Mark that production has started for this sample run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-notes">Notes (Optional)</Label>
              <Textarea
                id="start-notes"
                placeholder="Add any notes about production start..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will update the run status to "In Progress".
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartProduction}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Start Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Sample Done Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Sample Done</DialogTitle>
            <DialogDescription>
              Confirm that sample production is complete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="complete-notes">Notes (Optional)</Label>
              <Textarea
                id="complete-notes"
                placeholder="Add any notes about completion..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will update the run status to "Sample Done". You can record actuals next.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkSampleDone}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Timeline Item Component
interface TimelineItemProps {
  label: string;
  completed: boolean;
  timestamp?: string;
}

function TimelineItem({ label, completed, timestamp }: TimelineItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          completed ? 'bg-green-500 text-white' : 'bg-gray-200'
        }`}
      >
        {completed && <CheckCircle className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 flex items-center justify-between">
        <span className={`text-sm ${completed ? 'font-medium' : 'text-muted-foreground'}`}>
          {label}
        </span>
        {timestamp && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(timestamp), 'MMM dd, HH:mm')}
          </span>
        )}
      </div>
    </div>
  );
}
