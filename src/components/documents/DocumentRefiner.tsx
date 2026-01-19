'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentRefinerProps {
  sectionId: string;
  sectionTitle: string;
  currentContent: string;
  projectId: string;
  documentId: string;
  onUpdate: (newContent: string) => void;
}

const REFINEMENT_OPTIONS = [
  { id: 'expand', label: 'Expand & Add Detail', prompt: 'Expand this section with more detail and examples' },
  { id: 'concise', label: 'Make Concise', prompt: 'Make this section more concise while keeping key points' },
  { id: 'professional', label: 'More Professional', prompt: 'Rewrite this section in a more professional tone' },
  { id: 'persuasive', label: 'More Persuasive', prompt: 'Make this section more compelling and persuasive' },
  { id: 'data', label: 'Add Data Points', prompt: 'Add relevant statistics, metrics, or data points' },
  { id: 'custom', label: 'Custom Instructions', prompt: '' },
];

export function DocumentRefiner({
  sectionId,
  sectionTitle,
  currentContent,
  projectId,
  documentId,
  onUpdate,
}: DocumentRefinerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [refinedContent, setRefinedContent] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const handleRefine = async () => {
    if (!selectedOption) return;

    const option = REFINEMENT_OPTIONS.find((o) => o.id === selectedOption);
    if (!option) return;

    const prompt = selectedOption === 'custom' ? customPrompt : option.prompt;
    if (!prompt) {
      toast.error('Please enter custom instructions');
      return;
    }

    setIsRefining(true);
    try {
      const res = await fetch('/api/documents/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          sectionId,
          currentContent,
          refinementPrompt: prompt,
          projectId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRefinedContent(data.data.refinedContent);
          setShowComparison(true);
        }
      } else {
        toast.error('Failed to refine section');
      }
    } catch (error) {
      console.error('Error refining section:', error);
      toast.error('Failed to refine section');
    } finally {
      setIsRefining(false);
    }
  };

  const handleApply = () => {
    onUpdate(refinedContent);
    toast.success('Section updated');
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedOption(null);
    setCustomPrompt('');
    setRefinedContent('');
    setShowComparison(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1"
      >
        <Wand2 className="h-4 w-4" />
        Refine
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refine: {sectionTitle}</DialogTitle>
            <DialogDescription>
              Choose how you&apos;d like to improve this section
            </DialogDescription>
          </DialogHeader>

          {!showComparison ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {REFINEMENT_OPTIONS.map((option) => (
                  <Badge
                    key={option.id}
                    variant={selectedOption === option.id ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedOption(option.id)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>

              {selectedOption === 'custom' && (
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe how you want to refine this section..."
                  className="min-h-[80px]"
                />
              )}

              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Current Content:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentContent.slice(0, 500)}
                  {currentContent.length > 500 && '...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Original
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {currentContent}
                  </p>
                </div>
                <div className="rounded-lg border p-4 border-primary/50 bg-primary/5">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    Refined
                  </p>
                  <p className="text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {refinedContent}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!showComparison ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRefine}
                  disabled={!selectedOption || isRefining}
                >
                  {isRefining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Refine Section
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowComparison(false)}>
                  Try Different
                </Button>
                <Button onClick={handleApply}>
                  <Check className="h-4 w-4 mr-2" />
                  Apply Changes
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
