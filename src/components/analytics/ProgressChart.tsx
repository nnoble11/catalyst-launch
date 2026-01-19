'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProjectProgress {
  projectId: string;
  projectName: string;
  currentProgress: number;
  estimatedCompletionDate: string | null;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

interface ProgressChartProps {
  projects: ProjectProgress[];
}

const riskColors = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
};

const riskIcons = {
  low: TrendingUp,
  medium: Minus,
  high: TrendingDown,
};

export function ProgressChart({ projects }: ProgressChartProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No active projects to display
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Project Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {projects.map((project) => {
          const RiskIcon = riskIcons[project.riskLevel];
          return (
            <div key={project.projectId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{project.projectName}</span>
                  <Badge className={`text-xs ${riskColors[project.riskLevel]}`}>
                    <RiskIcon className="h-3 w-3 mr-1" />
                    {project.riskLevel} risk
                  </Badge>
                </div>
                <span className="text-sm font-semibold">{project.currentProgress}%</span>
              </div>

              <Progress value={project.currentProgress} className="h-2" />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {project.estimatedCompletionDate === 'Complete'
                    ? 'Completed'
                    : project.estimatedCompletionDate
                    ? `Est. completion: ${project.estimatedCompletionDate}`
                    : 'Completion date TBD'}
                </span>
                {project.recommendations.length > 0 && (
                  <span className="text-primary">
                    {project.recommendations.length} recommendation(s)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
