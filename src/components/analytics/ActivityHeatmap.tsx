'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HeatmapData {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data?: HeatmapData[];
  days?: number;
}

function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count <= 2) return 'bg-green-200 dark:bg-green-900';
  if (count <= 5) return 'bg-green-400 dark:bg-green-700';
  if (count <= 10) return 'bg-green-500 dark:bg-green-600';
  return 'bg-green-600 dark:bg-green-500';
}

function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

export function ActivityHeatmap({ data, days = 90 }: ActivityHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>(data || []);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (!data) {
      async function fetchData() {
        try {
          const res = await fetch(`/api/analytics?view=heatmap&days=${days}`);
          if (res.ok) {
            const result = await res.json();
            if (result.success) {
              setHeatmapData(result.data);
            }
          }
        } catch (error) {
          console.error('Error fetching heatmap data:', error);
        } finally {
          setLoading(false);
        }
      }
      fetchData();
    }
  }, [data, days]);

  const dateRange = generateDateRange(days);
  const dataMap = new Map(heatmapData.map((d) => [d.date, d.count]));

  // Group dates by week
  const weeks: string[][] = [];
  let currentWeek: string[] = [];

  dateRange.forEach((date, index) => {
    const dayOfWeek = new Date(date).getDay();

    if (index === 0) {
      // Fill in empty days at the start
      for (let i = 0; i < dayOfWeek; i++) {
        currentWeek.push('');
      }
    }

    currentWeek.push(date);

    if (dayOfWeek === 6 || index === dateRange.length - 1) {
      // Fill in remaining days at the end
      while (currentWeek.length < 7) {
        currentWeek.push('');
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const totalActivity = heatmapData.reduce((sum, d) => sum + d.count, 0);
  const activeDays = heatmapData.filter((d) => d.count > 0).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Activity Heatmap</CardTitle>
          <div className="text-sm text-muted-foreground">
            {activeDays} active days &middot; {totalActivity} activities
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {/* Day labels */}
            <div className="flex flex-col gap-1 pr-2 text-xs text-muted-foreground">
              <span className="h-3" />
              <span className="h-3">Mon</span>
              <span className="h-3" />
              <span className="h-3">Wed</span>
              <span className="h-3" />
              <span className="h-3">Fri</span>
              <span className="h-3" />
            </div>

            {/* Heatmap grid */}
            <TooltipProvider>
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((date, dayIndex) => {
                      if (!date) {
                        return (
                          <div
                            key={`empty-${weekIndex}-${dayIndex}`}
                            className="w-3 h-3 rounded-sm bg-transparent"
                          />
                        );
                      }

                      const count = dataMap.get(date) || 0;
                      const dateObj = new Date(date);
                      const formattedDate = dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <Tooltip key={date}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-3 h-3 rounded-sm ${getIntensityClass(count)} cursor-pointer hover:ring-1 hover:ring-primary`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{formattedDate}</p>
                            <p className="text-xs text-muted-foreground">
                              {count} {count === 1 ? 'activity' : 'activities'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
            <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
            <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
            <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
