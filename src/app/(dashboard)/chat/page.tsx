'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatInterface } from '@/components/ai/ChatInterface';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  title: string | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;
  name: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(projectIdFromUrl);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const url = selectedProject
        ? `/api/conversations?projectId=${selectedProject}`
        : '/api/conversations';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, [selectedProject]);

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

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(
          data.data?.map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })) || []
        );
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchConversations(), fetchProjects()]).finally(() => {
      setLoading(false);
    });
  }, [fetchConversations, fetchProjects]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, fetchMessages]);

  const createConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          title: 'New Conversation',
        }),
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      const data = await response.json();
      setConversations((prev) => [data.data, ...prev]);
      setSelectedConversation(data.data.id);
      setMessages([]);
      toast.success('New conversation started');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to start new conversation');
    }
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation when clicking delete

    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete conversation');

      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full gap-6">
        <div className="w-80 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar */}
      <div className="w-80 flex flex-col space-y-4 overflow-hidden">
        <div className="space-y-2 shrink-0">
          <Select
            value={selectedProject || 'all'}
            onValueChange={(value) => {
              setSelectedProject(value === 'all' ? null : value);
              setSelectedConversation(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={createConversation} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </div>

        <div className="flex-1 overflow-auto space-y-2">
          <h3 className="text-sm font-medium text-slate-500 sticky top-0 bg-background pb-2">
            Recent Conversations
          </h3>
          {conversations.length === 0 ? (
            <p className="text-sm text-slate-400">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`group relative w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${
                  selectedConversation === conv.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate font-medium">
                      {conv.title || 'Untitled'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDistanceToNow(new Date(conv.updatedAt))} ago
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <ChatInterface
            conversationId={selectedConversation}
            projectId={selectedProject || undefined}
            initialMessages={messages}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <MessageSquare className="h-16 w-16 text-slate-300" />
            <h2 className="mt-4 text-xl font-semibold">Start a Conversation</h2>
            <p className="mt-2 text-center text-slate-500">
              Select an existing conversation or start a new one to chat with
              your AI startup coach.
            </p>
            <Button onClick={createConversation} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              New Conversation
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full gap-6">
          <div className="w-80 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="flex-1" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
