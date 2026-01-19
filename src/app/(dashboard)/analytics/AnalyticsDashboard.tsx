'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressChart } from '@/components/analytics/ProgressChart';
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap';
import { VelocityGraph } from '@/components/analytics/VelocityGraph';
import { PredictionCard } from '@/components/analytics/PredictionCard';
import { RefreshCw, FileText, BarChart3 } from 'lucide-react';
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

export function AnalyticsDashboard() {
  const [predictions, setPredictions] = useState<PredictionsData | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const predictionsRes = await fetch('/api/analytics?view=predictions');

      if (predictionsRes.ok) {
        const data = await predictionsRes.json();
        if (data.success) {
          setPredictions(data.data);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="h-24 sm:h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            {/* Tabs - scrollable on mobile */}
            <div className="w-full sm:w-auto overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="w-max sm:w-auto">
                <TabsTrigger value="overview" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Overview</span>
                  <span className="xs:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="report" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Weekly Report</span>
                  <span className="xs:hidden">Report</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <Button variant="outline" size="sm" onClick={fetchData} className="flex-shrink-0">
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {predictions && (
                <VelocityGraph data={predictions.milestoneVelocity} />
              )}

              <Card>
                <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
                  <CardTitle className="text-base sm:text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">Active Projects</span>
                    <span className="font-semibold">
                      {predictions?.projectPredictions.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">Milestones This Month</span>
                    <span className="font-semibold">
                      {predictions?.milestoneVelocity.completedThisMonth || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">Avg. Days to Complete</span>
                    <span className="font-semibold">
                      {predictions?.milestoneVelocity.averageDaysToComplete || '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Heatmap - with horizontal scroll on mobile */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="min-w-[600px] sm:min-w-0">
                <ActivityHeatmap days={90} />
              </div>
            </div>

            {/* Progress & Predictions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg sm:text-xl">Weekly Progress Report</CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {weeklyReport.weekStart} - {weeklyReport.weekEnd}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl sm:text-3xl font-bold">{weeklyReport.overallScore}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Score</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-4 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-base sm:text-lg">{weeklyReport.summary}</p>

                  {weeklyReport.sections.map((section, index) => (
                    <div key={index} className="space-y-2">
                      <h3 className="font-semibold text-sm sm:text-base">{section.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{section.content}</p>

                      {section.highlights && section.highlights.length > 0 && (
                        <ul className="list-disc list-inside text-xs sm:text-sm space-y-1">
                          {section.highlights.map((highlight, i) => (
                            <li key={i}>{highlight}</li>
                          ))}
                        </ul>
                      )}

                      {section.metrics && section.metrics.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-2">
                          {section.metrics.map((metric, i) => (
                            <div
                              key={i}
                              className="text-center p-2 sm:p-3 rounded-lg bg-muted/50"
                            >
                              <p className="text-lg sm:text-xl font-semibold">{metric.value}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
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
                <CardContent className="p-8 sm:p-12 text-center">
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>Loading weekly report...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
