'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Zap, Clock } from 'lucide-react';

interface VelocityData {
  averageDaysToComplete: number;
  recentTrend: 'accelerating' | 'stable' | 'slowing';
  completedThisMonth: number;
  completedLastMonth: number;
}

interface VelocityGraphProps {
  data: VelocityData;
}

const trendConfig = {
  accelerating: {
    icon: TrendingUp,
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'Accelerating',
  },
  stable: {
    icon: Minus,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    label: 'Stable',
  },
  slowing: {
    icon: TrendingDown,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Slowing',
  },
};

export function VelocityGraph({ data }: VelocityGraphProps) {
  const trend = trendConfig[data.recentTrend];
  const TrendIcon = trend.icon;

  const monthChange =
    data.completedLastMonth > 0
      ? Math.round(
          ((data.completedThisMonth - data.completedLastMonth) /
            data.completedLastMonth) *
            100
        )
      : data.completedThisMonth > 0
      ? 100
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Milestone Velocity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trend Badge */}
        <div className="flex items-center justify-center">
          <Badge className={`${trend.bgColor} ${trend.color} text-sm px-4 py-2`}>
            <TrendIcon className="h-4 w-4 mr-2" />
            {trend.label}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{data.averageDaysToComplete}</p>
            <p className="text-xs text-muted-foreground">Avg. days per milestone</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              {monthChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <p className="text-2xl font-bold">
              {monthChange >= 0 ? '+' : ''}
              {monthChange}%
            </p>
            <p className="text-xs text-muted-foreground">Month-over-month</p>
          </div>
        </div>

        {/* Comparison Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">This Month</span>
            <span className="font-medium">{data.completedThisMonth} completed</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${Math.min(
                  (data.completedThisMonth /
                    Math.max(data.completedThisMonth, data.completedLastMonth, 1)) *
                    100,
                  100
                )}%`,
              }}
            />
          </div>

          <div className="flex justify-between text-sm mt-3">
            <span className="text-muted-foreground">Last Month</span>
            <span className="font-medium">{data.completedLastMonth} completed</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-muted-foreground/50 rounded-full transition-all"
              style={{
                width: `${Math.min(
                  (data.completedLastMonth /
                    Math.max(data.completedThisMonth, data.completedLastMonth, 1)) *
                    100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
