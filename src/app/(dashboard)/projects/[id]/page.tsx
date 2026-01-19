'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MilestoneProgress } from '@/components/dashboard/MilestoneProgress';
import { toast } from 'sonner';
import { STAGE_LABELS, type Stage } from '@/config/constants';
import { formatDistanceToNow } from 'date-fns';

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  order: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  stage: Stage;
  isActive: boolean;
  metadata: {
    targetAudience?: string;
    problemStatement?: string;
    valueProposition?: string;
    competitors?: string[];
    goals?: string[];
  } | null;
  createdAt: Date;
  updatedAt: Date;
  milestones: Milestone[];
}

interface Document {
  id: string;
  type: string;
  title: string;
  createdAt: Date;
}

const stageBadgeColors: Record<Stage, string> = {
  ideation: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  mvp: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  gtm: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

// Create a wrapper component that properly handles the promise
function AlertDialogWrapper({
  children,
  onConfirm,
}: {
  children: React.ReactNode;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      {children}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this project? This action cannot be
            undone and will also delete all milestones and documents.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Project not found');
          router.push('/projects');
          return;
        }
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data.data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents?projectId=${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchProject();
    fetchDocuments();
  }, [fetchProject, fetchDocuments]);

  const deleteProject = async () => {
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete project');

      toast.success('Project deleted');
      router.push('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const completedMilestones = project.milestones.filter((m) => m.isCompleted).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {project.name}
            </h1>
            <Badge className={stageBadgeColors[project.stage]} variant="secondary">
              {STAGE_LABELS[project.stage]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Created {formatDistanceToNow(new Date(project.createdAt))} ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/chat?projectId=${project.id}`}>
            <Button variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              AI Chat
            </Button>
          </Link>
          <Link href={`/documents?projectId=${project.id}`}>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </Button>
          </Link>
          <AlertDialogWrapper onConfirm={deleteProject}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </AlertDialogTrigger>
          </AlertDialogWrapper>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.description && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500">
                        Description
                      </h4>
                      <p className="mt-1 text-slate-900 dark:text-white">
                        {project.description}
                      </p>
                    </div>
                  )}

                  {project.metadata?.problemStatement && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500">
                        Problem Statement
                      </h4>
                      <p className="mt-1 text-slate-900 dark:text-white">
                        {project.metadata.problemStatement}
                      </p>
                    </div>
                  )}

                  {project.metadata?.targetAudience && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500">
                        Target Audience
                      </h4>
                      <p className="mt-1 text-slate-900 dark:text-white">
                        {project.metadata.targetAudience}
                      </p>
                    </div>
                  )}

                  {project.metadata?.valueProposition && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500">
                        Value Proposition
                      </h4>
                      <p className="mt-1 text-slate-900 dark:text-white">
                        {project.metadata.valueProposition}
                      </p>
                    </div>
                  )}

                  {project.metadata?.goals && project.metadata.goals.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500">Goals</h4>
                      <ul className="mt-1 list-inside list-disc text-slate-900 dark:text-white">
                        {project.metadata.goals.map((goal, index) => (
                          <li key={index}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!project.description &&
                    !project.metadata?.problemStatement &&
                    !project.metadata?.targetAudience && (
                      <p className="text-slate-500">
                        No additional details provided.
                      </p>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milestones" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <MilestoneProgress
                    projectId={project.id}
                    milestones={project.milestones}
                    onUpdate={fetchProject}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Generated Documents</CardTitle>
                  <CardDescription>
                    AI-generated documents for your project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-6">
                      <FileText className="mx-auto h-12 w-12 text-slate-400" />
                      <p className="mt-2 text-sm text-slate-500">
                        No documents generated yet
                      </p>
                      <Link href={`/documents?projectId=${project.id}`}>
                        <Button className="mt-4" variant="outline">
                          Generate Documents
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <Link
                          key={doc.id}
                          href={`/documents/${doc.id}`}
                          className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-slate-500" />
                            <span>{doc.title}</span>
                          </div>
                          <span className="text-sm text-slate-500">
                            {formatDistanceToNow(new Date(doc.createdAt))} ago
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {project.milestones.length > 0
                    ? Math.round(
                        (completedMilestones / project.milestones.length) * 100
                      )
                    : 0}
                  %
                </div>
                <p className="text-sm text-slate-500">
                  {completedMilestones} of {project.milestones.length} milestones
                  completed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/chat?projectId=${project.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat with AI Coach
                </Button>
              </Link>
              <Link
                href={`/documents/generate?projectId=${project.id}`}
                className="block"
              >
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Document
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
