'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Target, DollarSign, Users, Rocket, Sparkles, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import type { ProgressFeedItem, ProgressMilestoneType } from '@/types';

const MILESTONE_CONFIG: Record<ProgressMilestoneType, {
  label: string;
  icon: typeof Trophy;
  color: string;
  bgColor: string;
}> = {
  first_customer: { label: 'First Customer', icon: Users, color: 'text-success', bgColor: 'bg-success/10' },
  ten_customers: { label: '10 Customers', icon: Users, color: 'text-success', bgColor: 'bg-success/10' },
  hundred_customers: { label: '100 Customers', icon: Users, color: 'text-success', bgColor: 'bg-success/10' },
  first_revenue: { label: 'First Revenue', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
  mrr_1k: { label: '$1K MRR', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
  mrr_10k: { label: '$10K MRR', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
  mrr_100k: { label: '$100K MRR', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
  first_investor_meeting: { label: 'First Investor Meeting', icon: Building2, color: 'text-secondary', bgColor: 'bg-secondary/10' },
  term_sheet: { label: 'Term Sheet Received', icon: Building2, color: 'text-secondary', bgColor: 'bg-secondary/10' },
  funding_closed: { label: 'Funding Closed', icon: Building2, color: 'text-secondary', bgColor: 'bg-secondary/10' },
  mvp_launched: { label: 'MVP Launched', icon: Rocket, color: 'text-stage-mvp', bgColor: 'bg-stage-mvp/10' },
  product_hunt_launch: { label: 'Product Hunt Launch', icon: Rocket, color: 'text-stage-mvp', bgColor: 'bg-stage-mvp/10' },
  first_employee: { label: 'First Hire', icon: Users, color: 'text-warning', bgColor: 'bg-warning/10' },
  yc_interview: { label: 'YC Interview', icon: Sparkles, color: 'text-stage-ideation', bgColor: 'bg-stage-ideation/10' },
  demo_day: { label: 'Demo Day', icon: Sparkles, color: 'text-stage-ideation', bgColor: 'bg-stage-ideation/10' },
  first_partnership: { label: 'First Partnership', icon: Target, color: 'text-stage-gtm', bgColor: 'bg-stage-gtm/10' },
  custom: { label: 'Milestone', icon: Trophy, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

export default function ProgressFeedPage() {
  const [feedItems, setFeedItems] = useState<ProgressFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const response = await fetch('/api/progress/feed');
      if (response.ok) {
        const data = await response.json();
        setFeedItems(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch progress feed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Progress Feed</h1>
          <p className="text-sm text-muted-foreground">
            Celebrate milestones from founders in your cohort
          </p>
        </div>
      </div>

      {feedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="h-16 w-16 text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-semibold">No milestones yet</h2>
            <p className="mt-2 text-muted-foreground text-center max-w-sm">
              When founders in your cohort hit meaningful milestones, they&apos;ll appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedItems.map((item) => {
            const config = MILESTONE_CONFIG[item.milestone.milestoneType];
            const Icon = config.icon;

            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.bgColor}`}>
                      <Icon className={`h-6 w-6 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={`${config.bgColor} ${config.color} border-0`}>
                          {item.milestone.customTitle || config.label}
                        </Badge>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={item.user.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {item.user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{item.user.name || 'Anonymous'}</span>
                        <span className="text-sm text-muted-foreground">with</span>
                        <span className="text-sm font-medium text-primary">{item.project.name}</span>
                      </div>

                      {item.milestone.evidence?.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          &ldquo;{item.milestone.evidence.notes}&rdquo;
                        </p>
                      )}

                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.milestone.achievedAt))} ago
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
