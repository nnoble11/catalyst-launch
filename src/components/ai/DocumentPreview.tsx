'use client';

import React, { useState } from 'react';
import { Download, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/config/constants';

interface DocumentSection {
  id: string;
  title: string;
  content: string | Record<string, unknown> | Array<Record<string, unknown>>;
  order: number;
}

// Helper to check if an object is a character-indexed array (malformed string)
function isCharacterIndexedObject(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  return keys.every((key) => /^\d+$/.test(key) && typeof obj[key] === 'string' && (obj[key] as string).length === 1);
}

// Helper to reconstruct a string from a character-indexed object
function reconstructString(obj: Record<string, unknown>): string {
  const maxIndex = Math.max(...Object.keys(obj).map(Number));
  let result = '';
  for (let i = 0; i <= maxIndex; i++) {
    result += obj[i.toString()] || '';
  }
  return result;
}

// Helper to normalize content - convert any value to a displayable format
function normalizeValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    // Check if it's a simple string array
    if (value.every((v) => typeof v === 'string')) {
      return value.join(', ');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (isCharacterIndexedObject(obj)) {
      return reconstructString(obj);
    }
    return JSON.stringify(value);
  }
  return String(value);
}

// Helper to render content that might be a string, object, or array
function renderContent(content: unknown): React.ReactNode {
  // Handle null/undefined
  if (content === null || content === undefined) {
    return <span className="text-muted-foreground italic">No content</span>;
  }

  // Handle strings directly
  if (typeof content === 'string') {
    return content;
  }

  // Handle primitives
  if (typeof content === 'number' || typeof content === 'boolean') {
    return String(content);
  }

  // Handle arrays
  if (Array.isArray(content)) {
    // Check if it's an array of feature/description objects or similar
    if (content.length > 0 && typeof content[0] === 'object' && content[0] !== null) {
      const firstItem = content[0] as Record<string, unknown>;

      // Check for character-indexed array items (malformed strings)
      if (isCharacterIndexedObject(firstItem)) {
        return (
          <ol className="list-decimal pl-5 space-y-2">
            {content.map((item, index) => (
              <li key={index}>{reconstructString(item as Record<string, unknown>)}</li>
            ))}
          </ol>
        );
      }

      // Handle feature/description pattern
      if ('feature' in firstItem && 'description' in firstItem) {
        return (
          <ul className="space-y-3">
            {content.map((item, index) => {
              const feat = item as { feature: unknown; description: unknown };
              return (
                <li key={index} className="border-l-2 border-primary pl-3">
                  <strong>{normalizeValue(feat.feature)}</strong>
                  <p className="text-muted-foreground mt-1">
                    {normalizeValue(feat.description)}
                  </p>
                </li>
              );
            })}
          </ul>
        );
      }

      // Handle question/answer pattern (FAQ)
      if ('question' in firstItem && 'answer' in firstItem) {
        return (
          <div className="space-y-4">
            {content.map((item, index) => {
              const qa = item as { question: unknown; answer: unknown };
              return (
                <div key={index} className="border-b border-border pb-3">
                  <p className="font-semibold">{normalizeValue(qa.question)}</p>
                  <p className="text-muted-foreground mt-1">
                    {normalizeValue(qa.answer)}
                  </p>
                </div>
              );
            })}
          </div>
        );
      }

      // Handle step-based patterns
      if ('step' in firstItem || 'title' in firstItem) {
        return (
          <ol className="list-decimal pl-5 space-y-2">
            {content.map((item, index) => {
              const step = item as Record<string, unknown>;
              const title = step.title || step.step || step.name || `Step ${index + 1}`;
              const desc = step.description || step.content || step.details;
              return (
                <li key={index}>
                  <strong>{normalizeValue(title)}</strong>
                  {desc !== undefined && desc !== null && <p className="text-muted-foreground">{normalizeValue(desc)}</p>}
                </li>
              );
            })}
          </ol>
        );
      }

      // Generic object array - render as list
      return (
        <ul className="list-disc pl-5 space-y-2">
          {content.map((item, index) => (
            <li key={index}>
              {Object.entries(item as Record<string, unknown>)
                .filter(([key]) => !/^\d+$/.test(key)) // Skip numeric keys
                .map(([key, value]) => (
                  <span key={key}>
                    <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong>{' '}
                    {normalizeValue(value)}
                    <br />
                  </span>
                ))}
            </li>
          ))}
        </ul>
      );
    }

    // Simple array of strings/primitives
    return (
      <ul className="list-disc pl-5 space-y-1">
        {content.map((item, index) => (
          <li key={index}>{normalizeValue(item)}</li>
        ))}
      </ul>
    );
  }

  // Handle objects
  if (typeof content === 'object') {
    const obj = content as Record<string, unknown>;

    // Check for character-indexed object (malformed string)
    if (isCharacterIndexedObject(obj)) {
      return reconstructString(obj);
    }

    // Render as definition list
    return (
      <dl className="space-y-2">
        {Object.entries(obj)
          .filter(([key]) => !/^\d+$/.test(key)) // Skip numeric keys
          .map(([key, value]) => (
            <div key={key}>
              <dt className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}</dt>
              <dd className="ml-4 text-muted-foreground">
                {typeof value === 'object' ? renderContent(value) : normalizeValue(value)}
              </dd>
            </div>
          ))}
      </dl>
    );
  }

  return String(content);
}

interface DocumentPreviewProps {
  document: {
    id: string;
    type: DocumentType;
    title: string;
    content: {
      sections: DocumentSection[];
      metadata?: Record<string, unknown>;
    };
    version: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function DocumentPreview({ document }: DocumentPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(document.content.sections.map((s) => s.id))
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleAllSections = () => {
    if (expandedSections.size === document.content.sections.length) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(document.content.sections.map((s) => s.id)));
    }
  };

  const copyToClipboard = async () => {
    const text = document.content.sections
      .map((s) => {
        const contentStr = typeof s.content === 'string'
          ? s.content
          : JSON.stringify(s.content, null, 2);
        return `# ${s.title}\n\n${contentStr}`;
      })
      .join('\n\n---\n\n');

    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadAsJson = () => {
    const data = JSON.stringify(document, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as JSON');
  };

  const downloadAsMarkdown = () => {
    const markdown = `# ${document.title}\n\n${document.content.sections
      .map((s) => {
        const contentStr = typeof s.content === 'string'
          ? s.content
          : JSON.stringify(s.content, null, 2);
        return `## ${s.title}\n\n${contentStr}`;
      })
      .join('\n\n---\n\n')}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as Markdown');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{document.title}</CardTitle>
          <CardDescription className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">
              {DOCUMENT_TYPE_LABELS[document.type]}
            </Badge>
            <span>Version {document.version}</span>
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={downloadAsMarkdown}>
            <Download className="h-4 w-4 mr-2" />
            Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={downloadAsJson}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={toggleAllSections}>
            {expandedSections.size === document.content.sections.length
              ? 'Collapse All'
              : 'Expand All'}
          </Button>
        </div>

        {document.content.sections
          .sort((a, b) => a.order - b.order)
          .map((section) => (
            <Collapsible
              key={section.id}
              open={expandedSections.has(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border p-4 text-left hover:bg-muted">
                <h3 className="font-semibold">{section.title}</h3>
                {expandedSections.has(section.id) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 py-3">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {renderContent(section.content)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
      </CardContent>
    </Card>
  );
}
