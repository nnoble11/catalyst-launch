'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sun,
  AlertTriangle,
  Calendar,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { DailyBriefing } from '@/types';

interface DailyBriefingCardProps {
  briefing: DailyBriefing;
  onMarkRead?: (briefingId: string) => void;
}

export function DailyBriefingCard({ briefing, onMarkRead }: DailyBriefingCardProps) {
  const [expanded, setExpanded] = useState(!briefing.readAt);
  const { content } = briefing;

  const getMomentumColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getMomentumBg = (score: number) => {
    if (score >= 70) return 'bg-success';
    if (score >= 40) return 'bg-warning';
    return 'bg-destructive';
  };

  const handleRead = () => {
    if (!briefing.readAt && onMarkRead) {
      onMarkRead(briefing.id);
    }
  };

  return (
    <Card className={briefing.readAt ? 'opacity-80' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sun className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Daily Briefing</CardTitle>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(briefing.briefingDate))} ago
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className={`text-2xl font-bold ${getMomentumColor(content.momentumScore)}`}>
                {content.momentumScore}
              </p>
              <p className="text-xs text-muted-foreground">momentum</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setExpanded(!expanded);
                handleRead();
              }}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Summary */}
          <p className="text-sm">{content.summary}</p>

          {/* Momentum Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Momentum Score</span>
              <span className={getMomentumColor(content.momentumScore)}>
                {content.momentumScore}/100
              </span>
            </div>
            <Progress value={content.momentumScore} className={getMomentumBg(content.momentumScore)} />
          </div>

          {/* Progress */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>This Week&apos;s Progress</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tasks Completed:</span>
                <span className="ml-2 font-medium">{content.progress.completedTasks}</span>
              </div>
              {content.progress.milestonesHit.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Milestones Hit:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {content.progress.milestonesHit.map((m, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Blockers */}
          {content.blockers.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span>Potential Blockers</span>
              </div>
              <ul className="space-y-2 text-sm">
                {content.blockers.map((blocker, i) => (
                  <li key={i}>
                    <p className="text-muted-foreground">{blocker.description}</p>
                    <p className="text-xs text-warning mt-0.5">{blocker.suggestedAction}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Upcoming */}
          {content.upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Coming Up</span>
              </div>
              <ul className="space-y-1 text-sm">
                {content.upcoming.map((item, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.item}</span>
                    <Badge
                      variant={item.daysUntil <= 1 ? 'destructive' : item.daysUntil <= 3 ? 'warning' : 'secondary'}
                      className="text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {item.daysUntil === 0
                        ? 'Today'
                        : item.daysUntil === 1
                        ? 'Tomorrow'
                        : `${item.daysUntil} days`}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Insight */}
          <div className="rounded-lg bg-secondary/10 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-secondary">
              <Lightbulb className="h-4 w-4" />
              <span>Insight</span>
            </div>
            <p className="text-sm text-muted-foreground">{content.insight.observation}</p>
            <p className="text-sm">{content.insight.recommendation}</p>
          </div>

          {/* Focus Suggestion */}
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Today&apos;s Focus</span>
            </div>
            <p className="text-sm mt-1">{content.focusSuggestion}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
