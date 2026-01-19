'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUp, Lightbulb, Plus, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Idea {
  id: string;
  title: string;
  description: string;
  votes: number;
  createdAt: Date;
}

export default function LeaderboardPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());

  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
  });

  const fetchIdeas = useCallback(async () => {
    try {
      const response = await fetch('/api/ideas/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setIdeas(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch ideas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const submitIdea = async () => {
    if (!newIdea.title.trim() || !newIdea.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIdea),
      });

      if (!response.ok) {
        throw new Error('Failed to submit idea');
      }

      toast.success('Idea submitted successfully!');
      setIsSubmitDialogOpen(false);
      setNewIdea({ title: '', description: '' });
      fetchIdeas();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit idea');
    } finally {
      setSubmitting(false);
    }
  };

  const upvoteIdea = async (ideaId: string) => {
    if (votingIds.has(ideaId)) return;

    try {
      setVotingIds((prev) => new Set(prev).add(ideaId));

      const response = await fetch('/api/ideas/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      });

      if (!response.ok) {
        throw new Error('Failed to upvote');
      }

      // Optimistically update UI
      setIdeas((prev) =>
        prev
          .map((idea) =>
            idea.id === ideaId ? { ...idea, votes: idea.votes + 1 } : idea
          )
          .sort((a, b) => b.votes - a.votes)
      );
    } catch (error) {
      console.error('Upvote error:', error);
      toast.error('Failed to upvote');
    } finally {
      setVotingIds((prev) => {
        const next = new Set(prev);
        next.delete(ideaId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Idea Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Discover and vote on startup ideas from the community
          </p>
        </div>

        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Submit Idea
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Submit Your Idea</DialogTitle>
              <DialogDescription>
                Share your startup idea with the community and get feedback.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="A catchy name for your idea"
                  value={newIdea.title}
                  onChange={(e) =>
                    setNewIdea({ ...newIdea, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your idea, the problem it solves, and why it matters..."
                  rows={4}
                  value={newIdea.description}
                  onChange={(e) =>
                    setNewIdea({ ...newIdea, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSubmitDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={submitIdea} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Idea'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {ideas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lightbulb className="h-16 w-16 text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-semibold">No ideas yet</h2>
            <p className="mt-2 text-muted-foreground">
              Be the first to share your startup idea!
            </p>
            <Button
              className="mt-4"
              onClick={() => setIsSubmitDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Submit First Idea
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea, index) => (
            <Card key={idea.id} className="overflow-hidden">
              <div className="flex">
                <div className="flex flex-col items-center justify-center border-r border-border px-4 py-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 rounded-full p-0"
                    onClick={() => upvoteIdea(idea.id)}
                    disabled={votingIds.has(idea.id)}
                  >
                    {votingIds.has(idea.id) ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowUp className="h-5 w-5" />
                    )}
                  </Button>
                  <span className="mt-1 text-lg font-bold">{idea.votes}</span>
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <Badge
                            variant={index === 0 ? 'warning' : index === 1 ? 'outline' : 'default'}
                          >
                            #{index + 1}
                          </Badge>
                        )}
                        <h3 className="font-semibold">{idea.title}</h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {idea.description}
                      </p>
                    </div>
                    {index === 0 && (
                      <TrendingUp className="h-5 w-5 text-success" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Posted {formatDistanceToNow(new Date(idea.createdAt))} ago
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
