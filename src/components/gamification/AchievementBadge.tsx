'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Trophy,
  Target,
  Flame,
  Star,
  Zap,
  Award,
  Medal,
  Crown,
} from 'lucide-react';
import { ACHIEVEMENT_BADGES } from '@/config/constants';
import type { Achievement } from '@/types';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const badgeIcons: Record<string, typeof Trophy> = {
  first_project: Star,
  first_milestone: Target,
  first_document: Award,
  streak_7: Flame,
  streak_30: Zap,
  streak_100: Crown,
  all_milestones: Trophy,
  power_user: Medal,
};

const badgeColors: Record<string, string> = {
  first_project: 'bg-blue-100 text-blue-800 border-blue-300',
  first_milestone: 'bg-green-100 text-green-800 border-green-300',
  first_document: 'bg-purple-100 text-purple-800 border-purple-300',
  streak_7: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  streak_30: 'bg-orange-100 text-orange-800 border-orange-300',
  streak_100: 'bg-red-100 text-red-800 border-red-300',
  all_milestones: 'bg-amber-100 text-amber-800 border-amber-300',
  power_user: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

const sizeClasses = {
  sm: 'h-6 px-2 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function AchievementBadge({
  achievement,
  size = 'md',
  showTooltip = true,
}: AchievementBadgeProps) {
  const badgeInfo = ACHIEVEMENT_BADGES[achievement.badge as keyof typeof ACHIEVEMENT_BADGES];
  const Icon = badgeIcons[achievement.badge] || Award;
  const colorClass = badgeColors[achievement.badge] || 'bg-gray-100 text-gray-800';

  const badgeContent = (
    <Badge
      variant="outline"
      className={`${colorClass} ${sizeClasses[size]} font-medium gap-1.5`}
    >
      <Icon className={iconSizes[size]} />
      {badgeInfo?.name || achievement.badge}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent>
          <div className="text-center max-w-xs">
            <p className="font-semibold">{badgeInfo?.name || achievement.badge}</p>
            <p className="text-xs text-muted-foreground">
              {achievement.description || badgeInfo?.description}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Earned: {new Date(achievement.earnedAt).toLocaleDateString()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AchievementGridProps {
  achievements: Achievement[];
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  // Show both earned and unearned badges
  const allBadgeKeys = Object.keys(ACHIEVEMENT_BADGES);
  const earnedBadges = new Set(achievements.map((a) => a.badge));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {allBadgeKeys.map((badgeKey) => {
        const isEarned = earnedBadges.has(badgeKey);
        const achievement = achievements.find((a) => a.badge === badgeKey);
        const badgeInfo = ACHIEVEMENT_BADGES[badgeKey as keyof typeof ACHIEVEMENT_BADGES];
        const Icon = badgeIcons[badgeKey] || Award;

        return (
          <TooltipProvider key={badgeKey}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex flex-col items-center p-3 rounded-lg border ${
                    isEarned
                      ? 'bg-card'
                      : 'bg-muted/50 opacity-50 grayscale'
                  }`}
                >
                  <Icon
                    className={`h-8 w-8 mb-2 ${
                      isEarned ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <p className="text-xs font-medium text-center">{badgeInfo.name}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center max-w-xs">
                  <p className="font-semibold">{badgeInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{badgeInfo.description}</p>
                  {isEarned && achievement && (
                    <p className="text-xs text-green-600 mt-1">
                      Earned: {new Date(achievement.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                  {!isEarned && (
                    <p className="text-xs text-muted-foreground mt-1">Not yet earned</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
