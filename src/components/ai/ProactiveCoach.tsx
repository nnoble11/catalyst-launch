'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  Target,
  BookOpen,
  Zap,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { CoachSuggestion, StuckAnalysis } from '@/types';

interface ProactiveCoachProps {
  projectId?: string;
  onDismiss?: (suggestionId: string) => void;
}

const suggestionIcons = {
  task: Target,
  resource: BookOpen,
  reflection: Lightbulb,
  breakthrough: Zap,
};

const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function ProactiveCoach({ projectId, onDismiss }: ProactiveCoachProps) {
  const [suggestions, setSuggestions] = useState<CoachSuggestion[]>([]);
  const [stuckStatus, setStuckStatus] = useState<{
    isStuck: boolean;
    severity: string;
    encouragement: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchCoachData() {
      try {
        setLoading(true);

        // Fetch stuck status
        const stuckRes = await fetch(
          `/api/ai/breakthrough-session${projectId ? `?projectId=${projectId}` : ''}`
        );
        if (stuckRes.ok) {
          const stuckData = await stuckRes.json();
          if (stuckData.success) {
            setStuckStatus(stuckData.data);
          }
        }

        // Fetch suggestions
        const suggestRes = await fetch('/api/ai/suggest-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });
        if (suggestRes.ok) {
          const suggestData = await suggestRes.json();
          if (suggestData.success && suggestData.data?.suggestedTasks) {
            // Transform suggested tasks to coach suggestions
            const coachSuggestions: CoachSuggestion[] = suggestData.data.suggestedTasks
              .slice(0, 3)
              .map((task: { title: string; description: string; priority: string }, index: number) => ({
                id: `suggestion-${index}`,
                type: 'task' as const,
                title: task.title,
                description: task.description,
                priority: task.priority as 'high' | 'medium' | 'low',
                actionUrl: '/tasks',
                dismissed: false,
              }));
            setSuggestions(coachSuggestions);
          }
        }
      } catch (error) {
        console.error('Error fetching coach data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCoachData();
  }, [projectId]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    onDismiss?.(id);
  };

  const visibleSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id));

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stuckStatus?.isStuck && visibleSuggestions.length === 0) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">You&apos;re on Track!</CardTitle>
          </div>
          <CardDescription>
            {stuckStatus?.encouragement || 'Keep up the great work on your project.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={stuckStatus?.isStuck && stuckStatus.severity === 'high' ? 'border-orange-200 dark:border-orange-800' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {stuckStatus?.isStuck ? (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            ) : (
              <Lightbulb className="h-5 w-5 text-primary" />
            )}
            <CardTitle className="text-lg">
              {stuckStatus?.isStuck ? 'Need a Boost?' : 'Coach Suggestions'}
            </CardTitle>
          </div>
          {stuckStatus?.isStuck && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {stuckStatus.severity} priority
            </Badge>
          )}
        </div>
        {stuckStatus?.encouragement && (
          <CardDescription className="mt-2">{stuckStatus.encouragement}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {stuckStatus?.isStuck && stuckStatus.severity !== 'low' && (
          <Button
            variant="default"
            className="w-full justify-between bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            asChild
          >
            <a href={`/chat?mode=breakthrough${projectId ? `&projectId=${projectId}` : ''}`}>
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Start Breakthrough Session
              </span>
              <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
        )}

        {visibleSuggestions.map((suggestion) => {
          const Icon = suggestionIcons[suggestion.type];
          return (
            <div
              key={suggestion.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">{suggestion.title}</p>
                  <Badge className={`text-xs ${priorityColors[suggestion.priority]}`}>
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {suggestion.description}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {suggestion.actionUrl && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={suggestion.actionUrl}>
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(suggestion.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
