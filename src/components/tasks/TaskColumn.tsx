'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TASK_STATUS_LABELS } from '@/config/constants';
import type { Task, TaskStatus } from '@/types';

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: (title: string, status: TaskStatus) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onEditTask?: (task: Task) => void;
  onDragStart: (task: Task) => void;
  onDragOver: (e: React.DragEvent, status: TaskStatus) => void;
  onDrop: (status: TaskStatus) => void;
  isDragTarget?: boolean;
}

const columnColors = {
  backlog: 'border-t-slate-400',
  today: 'border-t-blue-500',
  in_progress: 'border-t-amber-500',
  done: 'border-t-green-500',
};

export function TaskColumn({
  status,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
}: TaskColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    setIsLoading(true);
    try {
      await onAddTask(newTaskTitle.trim(), status);
      setNewTaskTitle('');
      setIsAdding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTaskTitle('');
    }
  };

  return (
    <Card
      className={`flex flex-col h-full border-t-4 ${columnColors[status]} ${
        isDragTarget ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onDragOver={(e) => onDragOver(e, status)}
      onDrop={() => onDrop(status)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {TASK_STATUS_LABELS[status]}
            <span className="text-muted-foreground font-normal">({tasks.length})</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-2 pb-4">
        {isAdding && (
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title..."
              className="text-sm"
              autoFocus
              disabled={isLoading}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => {
                setIsAdding(false);
                setNewTaskTitle('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => onDragStart(task)}
          >
            <TaskCard
              task={task}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
            />
          </div>
        ))}

        {tasks.length === 0 && !isAdding && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>No tasks</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="mt-1"
            >
              Add one
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
