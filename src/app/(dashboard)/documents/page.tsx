'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DocumentPreview } from '@/components/ai/DocumentPreview';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from '@/config/constants';

interface Project {
  id: string;
  name: string;
}

interface Document {
  id: string;
  type: DocumentType;
  title: string;
  content: {
    sections: { id: string; title: string; content: string; order: number }[];
    metadata?: Record<string, unknown>;
  };
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

function DocumentsPageContent() {
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(projectIdFromUrl);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('pitch-deck');

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!selectedProject) {
      setDocuments([]);
      return;
    }

    try {
      const response = await fetch(`/api/documents?projectId=${selectedProject}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const generateDocument = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          documentType: selectedDocType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate document');
      }

      toast.success('Document generated successfully');
      setIsGenerateDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-slate-500">
            Generate and manage AI-powered documents
          </p>
        </div>

        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedProject}>
              <Plus className="mr-2 h-4 w-4" />
              Generate Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Document</DialogTitle>
              <DialogDescription>
                Choose a document type to generate for your project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select
                value={selectedDocType}
                onValueChange={(value: DocumentType) => setSelectedDocType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsGenerateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={generateDocument} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-6">
        <div className="w-80 space-y-4">
          <Select
            value={selectedProject || ''}
            onValueChange={(value) => {
              setSelectedProject(value || null);
              setSelectedDocument(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!selectedProject ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  Select a project to view documents
                </p>
              </CardContent>
            </Card>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  No documents yet
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setIsGenerateDialogOpen(true)}
                >
                  Generate First Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-500">Documents</h3>
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedDocument?.id === doc.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="truncate font-medium">{doc.title}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(doc.createdAt))} ago
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          {selectedDocument ? (
            <DocumentPreview document={selectedDocument} />
          ) : (
            <Card className="flex h-96 items-center justify-center">
              <CardContent className="text-center">
                <FileText className="mx-auto h-16 w-16 text-slate-300" />
                <h2 className="mt-4 text-xl font-semibold">
                  Select a Document
                </h2>
                <p className="mt-2 text-slate-500">
                  Choose a document from the list to preview it
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <DocumentsPageContent />
    </Suspense>
  );
}
