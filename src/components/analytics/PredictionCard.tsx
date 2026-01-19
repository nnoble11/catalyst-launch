'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, AlertTriangle, Target, ArrowRight } from 'lucide-react';

interface PredictionCardProps {
  focusAreas: string[];
  bottlenecks: string[];
  aiInsights: string[];
}

export function PredictionCard({
  focusAreas,
  bottlenecks,
  aiInsights,
}: PredictionCardProps) {
  return (
    <div className="space-y-4">
      {/* AI Insights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aiInsights.length > 0 ? (
            <ul className="space-y-3">
              {aiInsights.map((insight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keep working on your projects to generate personalized insights.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Focus Areas & Bottlenecks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Focus Areas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-success" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {focusAreas.length > 0 ? (
              <ul className="space-y-2">
                {focusAreas.map((area, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <ArrowRight className="h-3 w-3 text-success flex-shrink-0" />
                    {area}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No specific focus areas identified.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bottlenecks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Bottlenecks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bottlenecks.length > 0 ? (
              <ul className="space-y-2">
                {bottlenecks.map((bottleneck, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs border-orange-300 text-orange-600 mt-0.5"
                    >
                      !
                    </Badge>
                    <span className="text-sm text-muted-foreground">{bottleneck}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No bottlenecks detected. Great job!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
