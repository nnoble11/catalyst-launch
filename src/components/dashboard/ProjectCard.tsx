'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, FolderKanban, CheckCircle2, Circle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { STAGE_LABELS, type Stage } from '@/config/constants';

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    stage: Stage;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    milestones?: Milestone[];
  };
  onDelete?: (id: string) => void;
}

const stageBadgeColors: Record<Stage, string> = {
  ideation: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  mvp: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  gtm: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const milestones = project.milestones || [];
  const completedMilestones = milestones.filter((m) => m.isCompleted).length;
  const progressPercentage =
    milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 space-y-1">
              <Link href={`/projects/${project.id}`}>
                <CardTitle className="text-base hover:text-secondary transition-colors">
                  {project.name}
                </CardTitle>
              </Link>
              <CardDescription className="text-xs">
                Updated {formatDistanceToNow(new Date(project.updatedAt))} ago
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/edit`}>Edit Project</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(project.id)}
              >
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {project.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <Badge className={stageBadgeColors[project.stage]} variant="secondary">
            {STAGE_LABELS[project.stage]}
          </Badge>

          {!project.isActive && (
            <Badge variant="outline" className="text-muted-foreground">
              Archived
            </Badge>
          )}
        </div>

        {milestones.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {completedMilestones}/{milestones.length} milestones
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />

            <div className="space-y-1.5">
              {milestones.slice(0, 3).map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center gap-2 text-sm"
                >
                  {milestone.isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <span
                    className={
                      milestone.isCompleted
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground'
                    }
                  >
                    {milestone.title}
                  </span>
                </div>
              ))}
              {milestones.length > 3 && (
                <p className="text-xs text-muted-foreground pt-1">
                  +{milestones.length - 3} more milestones
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
