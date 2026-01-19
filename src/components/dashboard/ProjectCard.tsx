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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <FolderKanban className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <Link href={`/projects/${project.id}`}>
                <CardTitle className="text-lg hover:text-blue-600 dark:hover:text-blue-400">
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
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
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
                className="text-red-600 dark:text-red-400"
                onClick={() => onDelete?.(project.id)}
              >
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {project.description && (
          <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Badge className={stageBadgeColors[project.stage]} variant="secondary">
            {STAGE_LABELS[project.stage]}
          </Badge>

          {!project.isActive && (
            <Badge variant="outline" className="text-slate-500">
              Archived
            </Badge>
          )}
        </div>

        {milestones.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Progress</span>
              <span className="font-medium">
                {completedMilestones}/{milestones.length} milestones
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />

            <div className="mt-3 space-y-1">
              {milestones.slice(0, 3).map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center gap-2 text-sm"
                >
                  {milestone.isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-400" />
                  )}
                  <span
                    className={
                      milestone.isCompleted
                        ? 'text-slate-500 line-through'
                        : 'text-slate-700 dark:text-slate-300'
                    }
                  >
                    {milestone.title}
                  </span>
                </div>
              ))}
              {milestones.length > 3 && (
                <p className="text-xs text-slate-500">
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
