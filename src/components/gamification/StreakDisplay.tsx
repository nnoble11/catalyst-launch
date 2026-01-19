'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, Trophy, Target, Zap } from 'lucide-react';
import { STREAK_MILESTONES } from '@/config/constants';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  totalAchievements: number;
  lastActivityDate: string | null;
}

interface StreakDisplayProps {
  compact?: boolean;
}

export function StreakDisplay({ compact = false }: StreakDisplayProps) {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStreakData() {
      try {
        const res = await fetch('/api/streaks');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStreakData(data.data.summary);
          }
        }
      } catch (error) {
        console.error('Error fetching streak data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStreakData();
  }, []);

  if (loading) {
    return compact ? (
      <div className="animate-pulse h-8 w-20 bg-muted rounded" />
    ) : (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!streakData) return null;

  const nextMilestone = STREAK_MILESTONES.find((m) => m > streakData.currentStreak) || 365;
  const progressToMilestone = Math.min(
    (streakData.currentStreak / nextMilestone) * 100,
    100
  );

  const getStreakColor = (streak: number) => {
    if (streak >= 100) return 'text-purple-500';
    if (streak >= 30) return 'text-orange-500';
    if (streak >= 7) return 'text-yellow-500';
    return 'text-slate-500';
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 100) return '🔥';
    if (streak >= 30) return '⚡';
    if (streak >= 7) return '✨';
    if (streak >= 1) return '💪';
    return '🌱';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Flame className={`h-5 w-5 ${getStreakColor(streakData.currentStreak)}`} />
        <span className="font-semibold">{streakData.currentStreak}</span>
        <span className="text-xs text-muted-foreground">day streak</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className={`h-5 w-5 ${getStreakColor(streakData.currentStreak)}`} />
          Progress Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl">{getStreakEmoji(streakData.currentStreak)}</span>
          <div className="text-center">
            <p className={`text-4xl font-bold ${getStreakColor(streakData.currentStreak)}`}>
              {streakData.currentStreak}
            </p>
            <p className="text-sm text-muted-foreground">day streak</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Next milestone</span>
            <span className="font-medium">{nextMilestone} days</span>
          </div>
          <Progress value={progressToMilestone} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              <Trophy className="h-4 w-4" />
              <span className="font-semibold">{streakData.longestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500">
              <Zap className="h-4 w-4" />
              <span className="font-semibold">{streakData.totalPoints}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-500">
              <Target className="h-4 w-4" />
              <span className="font-semibold">{streakData.totalAchievements}</span>
            </div>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
