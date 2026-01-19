'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CaptureModal } from './CaptureModal';

interface QuickCaptureProps {
  projectId?: string;
  onCapture?: () => void;
}

export function QuickCapture({ projectId, onCapture }: QuickCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Handle keyboard shortcut (CMD+K or Ctrl+K)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCapture = () => {
    onCapture?.();
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:scale-105 transition-all z-50"
        size="icon"
        aria-label="Quick capture (⌘K)"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CaptureModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        projectId={projectId}
        onCapture={handleCapture}
      />
    </>
  );
}
