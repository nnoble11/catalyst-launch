'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, Plus, Loader2, ChevronLeft, Menu } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
  const [showSidebar, setShowSidebar] = useState(true);

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

  const handleSelectDocument = (doc: Document) => {
    setSelectedDocument(doc);
    // Hide sidebar on mobile when document is selected
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-10 w-48 sm:w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Generate and manage AI-powered documents
          </p>
        </div>

        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedProject} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Generate Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] mx-4 sm:mx-auto">
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
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setIsGenerateDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button onClick={generateDocument} disabled={generating} className="w-full sm:w-auto">
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

      <div className="flex gap-4 sm:gap-6 h-[calc(100vh-14rem)]">
        {/* Mobile overlay for sidebar */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          'fixed inset-y-0 left-0 z-40 w-[85vw] max-w-[320px] bg-background border-r md:static md:w-80 md:z-auto space-y-4 overflow-y-auto transition-transform duration-300 pt-4 md:pt-0 px-4 md:px-0',
          showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}>
          {/* Mobile close button */}
          <div className="flex items-center justify-between md:hidden mb-2">
            <h2 className="font-semibold">Documents</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

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
              <CardContent className="py-6 sm:py-8 text-center">
                <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Select a project to view documents
                </p>
              </CardContent>
            </Card>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-6 sm:py-8 text-center">
                <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
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
            <div className="space-y-2 pb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Documents</h3>
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDocument(doc)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedDocument?.id === doc.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium text-sm">{doc.title}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.createdAt))} ago
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Document Preview */}
        <div className="flex-1 min-w-0">
          {/* Mobile header with toggle */}
          <div className="flex items-center gap-2 mb-3 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-medium text-sm truncate">
              {selectedDocument?.title || 'Select a document'}
            </span>
          </div>

          {selectedDocument ? (
            <DocumentPreview document={selectedDocument} />
          ) : (
            <Card className="flex h-64 sm:h-96 items-center justify-center">
              <CardContent className="text-center p-6">
                <FileText className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50" />
                <h2 className="mt-4 text-lg sm:text-xl font-semibold">
                  Select a Document
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm">
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
        <div className="space-y-4 sm:space-y-6">
          <Skeleton className="h-10 w-48 sm:w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <DocumentsPageContent />
    </Suspense>
  );
}
