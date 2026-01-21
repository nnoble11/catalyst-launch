'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Lock, Search, GitBranch, Loader2 } from 'lucide-react';

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  url: string;
  owner: string;
  selected: boolean;
}

interface GitHubRepoSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (selectedRepos: string[]) => void;
}

export function GitHubRepoSelector({
  open,
  onOpenChange,
  onSave,
}: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchRepos();
    }
  }, [open]);

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/integrations/github/repos');
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }
      const data = await response.json();
      setRepos(data.repositories || []);
      setSelectedRepos(new Set(data.selectedRepositories || []));
    } catch (err) {
      console.error('Error fetching repos:', err);
      setError('Failed to load repositories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRepo = (fullName: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) {
        next.delete(fullName);
      } else {
        next.add(fullName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const filteredRepos = getFilteredRepos();
    const allSelected = filteredRepos.every((r) => selectedRepos.has(r.fullName));

    if (allSelected) {
      // Deselect all filtered repos
      setSelectedRepos((prev) => {
        const next = new Set(prev);
        filteredRepos.forEach((r) => next.delete(r.fullName));
        return next;
      });
    } else {
      // Select all filtered repos
      setSelectedRepos((prev) => {
        const next = new Set(prev);
        filteredRepos.forEach((r) => next.add(r.fullName));
        return next;
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/integrations/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedRepositories: Array.from(selectedRepos),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save repository selection');
      }

      toast.success(`Now monitoring ${selectedRepos.size} repositories`);
      onSave?.(Array.from(selectedRepos));
      onOpenChange(false);

      // Trigger initial sync after saving repos
      if (selectedRepos.size > 0) {
        try {
          await fetch('/api/integrations/github/sync', { method: 'POST' });
          toast.success('Initial sync started');
        } catch {
          // Silent fail - sync can be triggered manually
        }
      }
    } catch (err) {
      console.error('Error saving repos:', err);
      toast.error('Failed to save repository selection');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredRepos = () => {
    if (!searchQuery.trim()) return repos;
    const query = searchQuery.toLowerCase();
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.fullName.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
    );
  };

  const filteredRepos = getFilteredRepos();
  const allFilteredSelected = filteredRepos.length > 0 && filteredRepos.every((r) => selectedRepos.has(r.fullName));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Select GitHub Repositories
          </DialogTitle>
          <DialogDescription>
            Choose which repositories to monitor for activity. You&apos;ll receive updates for commits, pull requests, issues, and releases.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Repository List */}
        <div className="flex-1 overflow-y-auto border rounded-lg min-h-[300px]">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchRepos} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'No repositories match your search' : 'No repositories found'}
            </div>
          ) : (
            <div className="divide-y">
              {/* Select All Header */}
              <div className="p-3 bg-muted/50 sticky top-0">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {allFilteredSelected ? 'Deselect all' : 'Select all'}
                    {searchQuery && ` (${filteredRepos.length} shown)`}
                  </span>
                </label>
              </div>

              {/* Repo Items */}
              {filteredRepos.map((repo) => (
                <label
                  key={repo.id}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedRepos.has(repo.fullName)}
                    onCheckedChange={() => handleToggleRepo(repo.fullName)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{repo.fullName}</span>
                      {repo.private && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="mr-1 h-3 w-3" />
                          Private
                        </Badge>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {repo.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedRepos.size} {selectedRepos.size === 1 ? 'repository' : 'repositories'} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Selection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
