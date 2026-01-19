'use client';

import { useState, useEffect, useCallback } from 'react';
import { TaskColumn } from './TaskColumn';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, RefreshCw } from 'lucide-react';
import { TASK_STATUSES } from '@/config/constants';
import type { Task, TaskStatus } from '@/types';
import { toast } from 'sonner';

interface TaskBoardProps {
  projectId?: string;
  projects?: { id: string; name: string }[];
}

export function TaskBoard({ projectId: initialProjectId, projects = [] }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId || 'all');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragTargetStatus, setDragTargetStatus] = useState<TaskStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const url = projectFilter && projectFilter !== 'all'
        ? `/api/tasks?projectId=${projectFilter}`
        : '/api/tasks';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTasks(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddTask = async (title: string, status: TaskStatus) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          status,
          projectId: projectFilter !== 'all' ? projectFilter : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTasks((prev) => [...prev, data.data]);
          toast.success('Task created');
        }
      } else {
        toast.error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...data.data } : t))
          );
          if (updates.status === 'done') {
            toast.success('Task completed!');
          }
        }
      } else {
        toast.error('Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast.success('Task deleted');
      } else {
        toast.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragTargetStatus(status);
  };

  const handleDrop = async (status: TaskStatus) => {
    if (draggedTask && draggedTask.status !== status) {
      await handleUpdateTask(draggedTask.id, { status });
    }
    setDraggedTask(null);
    setDragTargetStatus(null);
  };

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/suggest-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectFilter !== 'all' ? projectFilter : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // API returns { success: true, data: [...tasks] }
        const suggestions = Array.isArray(data.data) ? data.data : data.data?.tasks || [];
        if (data.success && suggestions.length > 0) {
          // Create the suggested tasks (limit to 3)
          for (const suggestion of suggestions.slice(0, 3)) {
            await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: suggestion.title,
                description: suggestion.description,
                priority: suggestion.priority || 'medium',
                status: 'backlog',
                projectId: projectFilter !== 'all' ? projectFilter : undefined,
                aiSuggested: true,
                aiRationale: suggestion.estimatedTime ? `Estimated: ${suggestion.estimatedTime}` : 'AI-suggested task',
              }),
            });
          }
          await fetchTasks();
          toast.success(`${Math.min(suggestions.length, 3)} AI suggestions added!`);
        } else {
          toast.info('No suggestions available. Try adding more project context.');
        }
      } else {
        toast.error('Failed to generate suggestions');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((t) => t.status === status);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-12rem)]">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="animate-pulse">
            <div className="h-full bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" onClick={fetchTasks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Button
          onClick={handleGenerateSuggestions}
          disabled={isGenerating}
          className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : 'AI Suggestions'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-14rem)]">
        {TASK_STATUSES.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={getTasksByStatus(status)}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragTarget={dragTargetStatus === status}
          />
        ))}
      </div>
    </div>
  );
}
