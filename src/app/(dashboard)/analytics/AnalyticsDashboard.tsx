'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressChart } from '@/components/analytics/ProgressChart';
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap';
import { VelocityGraph } from '@/components/analytics/VelocityGraph';
import { PredictionCard } from '@/components/analytics/PredictionCard';
import { StreakDisplay } from '@/components/gamification/StreakDisplay';
import { AchievementGrid } from '@/components/gamification/AchievementBadge';
import { RefreshCw, FileText, BarChart3, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface PredictionsData {
  milestoneVelocity: {
    averageDaysToComplete: number;
    recentTrend: 'accelerating' | 'stable' | 'slowing';
    completedThisMonth: number;
    completedLastMonth: number;
  };
  projectPredictions: {
    projectId: string;
    projectName: string;
    currentProgress: number;
    estimatedCompletionDate: string | null;
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    recommendations: string[];
  }[];
  focusAreas: string[];
  bottlenecks: string[];
  aiInsights: string[];
}

interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  sections: {
    title: string;
    content: string;
    highlights?: string[];
    metrics?: { label: string; value: string | number; change?: string }[];
  }[];
  overallScore: number;
  summary: string;
}

interface StreaksData {
  streaks: {
    id: string;
    streakType: string;
    achievements: { badge: string; earnedAt: string; description: string }[];
  }[];
  summary: {
    currentStreak: number;
    longestStreak: number;
    totalPoints: number;
    totalAchievements: number;
  };
}

export function AnalyticsDashboard() {
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [streaksData, setStreaksData] = useState<StreaksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [predictionsRes, streaksRes] = await Promise.all([
        fetch('/api/analytics?view=predictions'),
        fetch('/api/streaks'),
      ]);

      if (predictionsRes.ok) {
        const data = await predictionsRes.json();
        if (data.success) {
          setPredictions(data.data);
        }
      }

      if (streaksRes.ok) {
        const data = await streaksRes.json();
        if (data.success) {
          setStreaksData(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyReport = async () => {
    try {
      const res = await fetch('/api/reports/weekly');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWeeklyReport(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching weekly report:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'report' && !weeklyReport) {
      fetchWeeklyReport();
    }
  }, [activeTab, weeklyReport]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const allAchievements =
    streaksData?.streaks.flatMap((s) => s.achievements) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="report" className="gap-2">
                <FileText className="h-4 w-4" />
                Weekly Report
              </TabsTrigger>
              <TabsTrigger value="achievements" className="gap-2">
                <Trophy className="h-4 w-4" />
                Achievements
              </TabsTrigger>
            </TabsList>

            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StreakDisplay />

              {predictions && (
                <VelocityGraph data={predictions.milestoneVelocity} />
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Projects</span>
                    <span className="font-semibold">
                      {predictions?.projectPredictions.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Achievements</span>
                    <span className="font-semibold">
                      {streaksData?.summary.totalAchievements || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Points</span>
                    <span className="font-semibold">
                      {streaksData?.summary.totalPoints || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Heatmap */}
            <ActivityHeatmap days={90} />

            {/* Progress & Predictions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {predictions && (
                <ProgressChart projects={predictions.projectPredictions} />
              )}

              {predictions && (
                <PredictionCard
                  focusAreas={predictions.focusAreas}
                  bottlenecks={predictions.bottlenecks}
                  aiInsights={predictions.aiInsights}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="report">
            {weeklyReport ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Weekly Progress Report</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {weeklyReport.weekStart} - {weeklyReport.weekEnd}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{weeklyReport.overallScore}</p>
                      <p className="text-sm text-muted-foreground">Score</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-lg">{weeklyReport.summary}</p>

                  {weeklyReport.sections.map((section, index) => (
                    <div key={index} className="space-y-2">
                      <h3 className="font-semibold">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.content}</p>

                      {section.highlights && section.highlights.length > 0 && (
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {section.highlights.map((highlight, i) => (
                            <li key={i}>{highlight}</li>
                          ))}
                        </ul>
                      )}

                      {section.metrics && section.metrics.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                          {section.metrics.map((metric, i) => (
                            <div
                              key={i}
                              className="text-center p-3 rounded-lg bg-muted/50"
                            >
                              <p className="text-xl font-semibold">{metric.value}</p>
                              <p className="text-xs text-muted-foreground">
                                {metric.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>Loading weekly report...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle>Your Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <AchievementGrid achievements={allAchievements} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
