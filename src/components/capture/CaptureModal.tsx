'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  FileText,
  CheckSquare,
  HelpCircle,
  Link,
  Send,
  Loader2,
} from 'lucide-react';
import { CAPTURE_TYPE_LABELS } from '@/config/constants';
import type { CaptureType } from '@/types';
import { toast } from 'sonner';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onCapture?: () => void;
}

const captureTypeIcons = {
  idea: Lightbulb,
  note: FileText,
  task: CheckSquare,
  question: HelpCircle,
  resource: Link,
};

const captureTypeColors = {
  idea: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  note: 'bg-blue-100 text-blue-800 border-blue-300',
  task: 'bg-green-100 text-green-800 border-green-300',
  question: 'bg-purple-100 text-purple-800 border-purple-300',
  resource: 'bg-orange-100 text-orange-800 border-orange-300',
};

export function CaptureModal({ isOpen, onClose, projectId, onCapture }: CaptureModalProps) {
  const [content, setContent] = useState('');
  const [detectedType, setDetectedType] = useState<CaptureType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Simple client-side type detection for preview
  useEffect(() => {
    if (!content.trim()) {
      setDetectedType(null);
      return;
    }

    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('?') || lowerContent.startsWith('how') || lowerContent.startsWith('what') || lowerContent.startsWith('why')) {
      setDetectedType('question');
    } else if (lowerContent.includes('http://') || lowerContent.includes('https://') || lowerContent.includes('www.')) {
      setDetectedType('resource');
    } else if (lowerContent.startsWith('todo:') || lowerContent.startsWith('task:') || lowerContent.includes('need to') || lowerContent.includes('should')) {
      setDetectedType('task');
    } else if (lowerContent.startsWith('idea:') || lowerContent.includes('what if') || lowerContent.includes('could we')) {
      setDetectedType('idea');
    } else {
      setDetectedType('note');
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/captures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          projectId,
          autoProcess: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(`Captured as ${CAPTURE_TYPE_LABELS[data.data.type as CaptureType]}`);
          setContent('');
          onCapture?.();
          onClose();
        }
      } else {
        toast.error('Failed to save capture');
      }
    } catch (error) {
      console.error('Error creating capture:', error);
      toast.error('Failed to save capture');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Quick Capture
            <Badge variant="outline" className="text-xs font-normal">
              ⌘K
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Capture an idea, task, question, or note..."
              className="min-h-[120px] resize-none pr-12"
              disabled={isSubmitting}
            />
            <Button
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8"
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {detectedType && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Detected type:</span>
              <Badge className={captureTypeColors[detectedType]}>
                {(() => {
                  const Icon = captureTypeIcons[detectedType];
                  return <Icon className="h-3 w-3 mr-1" />;
                })()}
                {CAPTURE_TYPE_LABELS[detectedType]}
              </Badge>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(Object.keys(captureTypeIcons) as CaptureType[]).map((type) => {
              const Icon = captureTypeIcons[type];
              return (
                <Badge
                  key={type}
                  variant="outline"
                  className={`cursor-pointer hover:bg-accent ${
                    detectedType === type ? captureTypeColors[type] : ''
                  }`}
                  onClick={() => setDetectedType(type)}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {CAPTURE_TYPE_LABELS[type]}
                </Badge>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 rounded bg-muted">⌘</kbd>+
            <kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd> to save, or{' '}
            <kbd className="px-1 py-0.5 rounded bg-muted">Esc</kbd> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
