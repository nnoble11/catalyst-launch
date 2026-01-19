'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  order: number;
}

interface MilestoneProgressProps {
  projectId: string;
  milestones: Milestone[];
  onUpdate?: () => void;
}

export function MilestoneProgress({
  projectId,
  milestones,
  onUpdate,
}: MilestoneProgressProps) {
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const completedCount = milestones.filter((m) => m.isCompleted).length;
  const progressPercentage =
    milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  const toggleMilestone = async (milestone: Milestone) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: milestone.id,
          isCompleted: !milestone.isCompleted,
          title: milestone.title,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update milestone');
      }

      toast.success(
        milestone.isCompleted
          ? 'Milestone marked as incomplete'
          : 'Milestone completed!'
      );
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling milestone:', error);
      toast.error('Failed to update milestone');
    } finally {
      setLoading(false);
    }
  };

  const addMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMilestoneTitle.trim(),
          order: milestones.length,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create milestone');
      }

      setNewMilestoneTitle('');
      setIsAddingMilestone(false);
      toast.success('Milestone added');
      onUpdate?.();
    } catch (error) {
      console.error('Error adding milestone:', error);
      toast.error('Failed to add milestone');
    } finally {
      setLoading(false);
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/milestones?milestoneId=${milestoneId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete milestone');
      }

      toast.success('Milestone deleted');
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast.error('Failed to delete milestone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Milestones</h3>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {milestones.length} completed
          </p>
        </div>

        <Dialog open={isAddingMilestone} onOpenChange={setIsAddingMilestone}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
              <DialogDescription>
                Create a new milestone for this project.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Milestone title"
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addMilestone();
                }
              }}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddingMilestone(false)}
              >
                Cancel
              </Button>
              <Button onClick={addMilestone} disabled={loading}>
                Add Milestone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Progress value={progressPercentage} className="h-2" />

      <div className="space-y-2">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className="group flex items-center justify-between rounded-lg border border-border p-3"
          >
            <button
              className="flex flex-1 items-center gap-3 text-left"
              onClick={() => toggleMilestone(milestone)}
              disabled={loading}
            >
              {milestone.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              )}
              <div>
                <p
                  className={
                    milestone.isCompleted
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  }
                >
                  {milestone.title}
                </p>
                {milestone.description && (
                  <p className="text-sm text-muted-foreground">
                    {milestone.description}
                  </p>
                )}
              </div>
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
              onClick={() => deleteMilestone(milestone.id)}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}

        {milestones.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No milestones yet. Add one to track your progress.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
