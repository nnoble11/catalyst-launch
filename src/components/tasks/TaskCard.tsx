'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Edit2, Sparkles, Calendar, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { TASK_PRIORITY_LABELS, type TaskPriority } from '@/config/constants';
import type { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onEdit?: (task: Task) => void;
  isDragging?: boolean;
}

// Use badge variants for priority colors (defined in design system)
const priorityBadgeVariants: Record<TaskPriority, 'priority-low' | 'priority-medium' | 'priority-high' | 'priority-urgent'> = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
  urgent: 'priority-urgent',
};

export function TaskCard({ task, onUpdate, onDelete, onEdit, isDragging }: TaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onUpdate(task.id, { status: 'done' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(task.id);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <Card
      className={`group cursor-grab transition-all ${
        isDragging ? 'opacity-50 rotate-2 shadow-lg' : 'hover:shadow-md'
      } ${task.status === 'done' ? 'opacity-60' : ''}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              {task.aiSuggested && (
                <Sparkles className="h-3.5 w-3.5 text-stage-ideation flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm font-medium ${
                  task.status === 'done' ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {task.title}
              </p>
            </div>

            {task.description && (
              <div className="mb-2">
                <p className={`text-xs text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {task.description}
                </p>
                {task.description.length > 100 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-1"
                  >
                    {isExpanded ? (
                      <>Show less <ChevronUp className="h-3 w-3" /></>
                    ) : (
                      <>Show more <ChevronDown className="h-3 w-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={priorityBadgeVariants[task.priority]} className="text-xs">
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>

              {task.dueDate && (
                <Badge
                  variant="outline"
                  className={`text-xs ${isOverdue ? 'border-destructive text-destructive' : ''}`}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(task.dueDate)}
                </Badge>
              )}
            </div>

            {task.aiRationale && (
              <p className="text-xs text-stage-ideation mt-2 italic">
                AI: {task.aiRationale}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.status !== 'done' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleComplete}
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 text-success" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
