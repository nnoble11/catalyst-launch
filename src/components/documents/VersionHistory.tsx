'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Clock, RotateCcw, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DocumentVersion {
  id: string;
  version: number;
  content: {
    sections: {
      id: string;
      title: string;
      content: string;
      order: number;
    }[];
    metadata?: Record<string, unknown>;
  };
  changeDescription: string | null;
  createdAt: string;
}

interface VersionHistoryProps {
  documentId: string;
  currentVersion: number;
  onRestore: (version: DocumentVersion) => void;
}

export function VersionHistory({
  documentId,
  currentVersion,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVersions(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVersionLabel = (version: DocumentVersion) => {
    if (version.version === currentVersion) {
      return 'Current';
    }
    return `v${version.version}`;
  };

  return (
    <>
      <Sheet onOpenChange={(open) => open && fetchVersions()}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            Version History
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
            <SheetDescription>
              View and restore previous versions of this document
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-10rem)] mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-muted rounded-lg" />
                  </div>
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No version history available</p>
                <p className="text-sm">Versions are saved when you make changes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border ${
                      version.version === currentVersion
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={version.version === currentVersion ? 'default' : 'secondary'}
                        >
                          {getVersionLabel(version)}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(version.createdAt)}
                        </span>
                      </div>
                    </div>

                    {version.changeDescription && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {version.changeDescription}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewVersion(version)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      {version.version !== currentVersion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRestore(version)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={!!previewVersion} onOpenChange={(open) => !open && setPreviewVersion(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Version {previewVersion?.version} Preview
            </DialogTitle>
            <DialogDescription>
              {previewVersion && formatDate(previewVersion.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {previewVersion?.content.sections.map((section) => (
              <div key={section.id} className="space-y-2">
                <h3 className="font-semibold">{section.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPreviewVersion(null)}>
              Close
            </Button>
            {previewVersion && previewVersion.version !== currentVersion && (
              <Button
                onClick={() => {
                  onRestore(previewVersion);
                  setPreviewVersion(null);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore This Version
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
