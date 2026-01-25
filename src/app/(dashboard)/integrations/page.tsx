'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Video,
  BookOpen,
  Bookmark,
  CloudRain,
  Gem,
  Network,
  Sparkles,
  FileText,
  LayoutList,
  CheckSquare,
  ListChecks,
  MessageSquare,
  Mail,
  MessageCircle,
  Send,
  Users,
  Calendar,
  HardDrive,
  Box,
  PenTool,
  Briefcase,
  Globe,
  Bot,
  Search,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { GitHubRepoSelector } from '@/components/integrations/GitHubRepoSelector';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { IntegrationProvider, IntegrationCategory, IntegrationDefinition } from '@/types/integrations';
import { INTEGRATION_CATEGORY_LABELS } from '@/types/integrations';
import { providerIdToSlug } from '@/config/integrations';

// Icon mapping for integrations
const INTEGRATION_ICONS: Record<string, React.ReactNode> = {
  brain: <Brain className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  'book-open': <BookOpen className="h-5 w-5" />,
  bookmark: <Bookmark className="h-5 w-5" />,
  'cloud-rain': <CloudRain className="h-5 w-5" />,
  gem: <Gem className="h-5 w-5" />,
  network: <Network className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  'file-text': <FileText className="h-5 w-5" />,
  'layout-list': <LayoutList className="h-5 w-5" />,
  'check-square': <CheckSquare className="h-5 w-5" />,
  'list-checks': <ListChecks className="h-5 w-5" />,
  'message-square': <MessageSquare className="h-5 w-5" />,
  mail: <Mail className="h-5 w-5" />,
  'message-circle': <MessageCircle className="h-5 w-5" />,
  send: <Send className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />,
  'hard-drive': <HardDrive className="h-5 w-5" />,
  box: <Box className="h-5 w-5" />,
  'pen-tool': <PenTool className="h-5 w-5" />,
  briefcase: <Briefcase className="h-5 w-5" />,
  globe: <Globe className="h-5 w-5" />,
  bot: <Bot className="h-5 w-5" />,
  search: <Search className="h-5 w-5" />,
};

// Category icons
const CATEGORY_ICONS: Record<IntegrationCategory, React.ReactNode> = {
  meetings_notes: <Video className="h-4 w-4" />,
  knowledge_reading: <BookOpen className="h-4 w-4" />,
  tasks_projects: <CheckSquare className="h-4 w-4" />,
  communication: <MessageSquare className="h-4 w-4" />,
  productivity: <Calendar className="h-4 w-4" />,
  capture_tools: <Globe className="h-4 w-4" />,
};

interface IntegrationStatus {
  provider: string;
  connected: boolean;
  lastSyncAt?: string;
  lastSuccessfulSyncAt?: string;
  syncStatus?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  totalItemsSynced?: number;
}

interface IntegrationsResponse {
  definitions: IntegrationDefinition[];
  connected: IntegrationStatus[];
}

export default function IntegrationsPage() {
  const [definitions, setDefinitions] = useState<IntegrationDefinition[]>([]);
  const [connectedIntegrations, setConnectedIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [githubRepoSelectorOpen, setGithubRepoSelectorOpen] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations');
      if (response.ok) {
        const data = await response.json();

        // Set connected integrations with metadata and sync state
        setConnectedIntegrations(
          data.data?.map((i: {
            provider: string;
            metadata?: Record<string, unknown>;
            lastSyncAt?: string;
            lastSuccessfulSyncAt?: string;
            syncStatus?: string;
            syncError?: string;
            totalItemsSynced?: number;
          }) => ({
            provider: i.provider,
            connected: true,
            metadata: i.metadata,
            lastSyncAt: i.lastSyncAt || i.lastSuccessfulSyncAt,
            lastSuccessfulSyncAt: i.lastSuccessfulSyncAt,
            syncStatus: i.syncStatus,
            error: i.syncError,
            totalItemsSynced: i.totalItemsSynced,
          })) || []
        );
      }

      // Fetch definitions from registry endpoint
      const defsResponse = await fetch('/api/integrations/definitions');
      if (defsResponse.ok) {
        const defsData = await defsResponse.json();
        setDefinitions(defsData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const isConnected = (provider: string) => {
    return connectedIntegrations.some(
      (i) => i.provider === provider && i.connected
    );
  };

  const getConnectionStatus = (provider: string): IntegrationStatus | undefined => {
    return connectedIntegrations.find((i) => i.provider === provider);
  };

  const needsConfiguration = (provider: string): boolean => {
    if (provider === 'github') {
      const status = getConnectionStatus('github');
      if (!status?.connected) return false;
      const selectedRepos = (status.metadata?.selectedRepositories as string[]) || [];
      return selectedRepos.length === 0;
    }
    return false;
  };

  const handleConfigure = (provider: string) => {
    if (provider === 'github') {
      setGithubRepoSelectorOpen(true);
    }
  };

  const handleConnect = async (provider: IntegrationProvider) => {
    try {
      // Initiate OAuth flow by redirecting to the auth endpoint
      const slug = providerIdToSlug(provider);
      const response = await fetch(`/api/integrations/${slug}/auth`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.authUrl) {
          window.location.href = data.data.authUrl;
        } else {
          toast.info('This integration requires manual setup');
        }
      } else {
        toast.error('Failed to start authentication');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect integration');
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const slug = provider.replace(/_/g, '-');
      const response = await fetch(`/api/integrations/${slug}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConnectedIntegrations((prev) =>
          prev.filter((i) => i.provider !== provider)
        );
        toast.success('Integration disconnected');
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect integration');
    }
  };

  const handleSync = async (provider: string) => {
    setSyncing(provider);
    try {
      const slug = providerIdToSlug(provider);
      const response = await fetch(`/api/integrations/${slug}/sync`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Synced ${data.data?.itemsProcessed || 0} items from ${provider}`);
        await fetchIntegrations(); // Refresh status
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync');
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncing('all');
    try {
      const response = await fetch('/api/integrations/sync-all', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        const summary = data.data;
        toast.success(
          `Synced ${summary.totalItemsProcessed} items from ${summary.successful} integrations`
        );
        await fetchIntegrations(); // Refresh status
      } else {
        toast.error('Sync failed');
      }
    } catch (error) {
      console.error('Sync all error:', error);
      toast.error('Failed to sync all integrations');
    } finally {
      setSyncing(null);
    }
  };

  // Group definitions by category
  const groupedDefinitions = definitions.reduce((acc, def) => {
    if (!acc[def.category]) {
      acc[def.category] = [];
    }
    acc[def.category].push(def);
    return acc;
  }, {} as Record<IntegrationCategory, IntegrationDefinition[]>);

  // Get filtered definitions
  const getFilteredDefinitions = () => {
    if (activeCategory === 'all') {
      return definitions;
    }
    if (activeCategory === 'connected') {
      return definitions.filter((d) => isConnected(d.id));
    }
    return definitions.filter((d) => d.category === activeCategory);
  };

  const connectedCount = connectedIntegrations.filter((i) => i.connected).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect your tools to build your second brain. Capture, sync, and organize information from anywhere.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {connectedCount} connected
          </Badge>
          {connectedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncing !== null}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing === 'all' ? 'animate-spin' : ''}`} />
              Sync All
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-sm">
            All
          </TabsTrigger>
          <TabsTrigger value="connected" className="text-sm">
            Connected ({connectedCount})
          </TabsTrigger>
          {(Object.keys(INTEGRATION_CATEGORY_LABELS) as IntegrationCategory[]).map((category) => (
            <TabsTrigger key={category} value={category} className="text-sm">
              <span className="mr-1.5">{CATEGORY_ICONS[category]}</span>
              {INTEGRATION_CATEGORY_LABELS[category]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {activeCategory === 'connected' && connectedCount === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Integrations Connected</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect your first integration to start building your second brain.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setActiveCategory('all')}
              >
                Browse Integrations
              </Button>
            </div>
          ) : activeCategory !== 'all' && activeCategory !== 'connected' ? (
            // Show single category
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {CATEGORY_ICONS[activeCategory as IntegrationCategory]}
                <h2 className="text-lg font-semibold">
                  {INTEGRATION_CATEGORY_LABELS[activeCategory as IntegrationCategory]}
                </h2>
                <Badge variant="secondary">
                  {groupedDefinitions[activeCategory as IntegrationCategory]?.length || 0}
                </Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {(groupedDefinitions[activeCategory as IntegrationCategory] || []).map((def) => (
                  <IntegrationCard
                    key={def.id}
                    id={def.id}
                    name={def.name}
                    description={def.description}
                    icon={INTEGRATION_ICONS[def.icon] || <Globe className="h-5 w-5" />}
                    isConnected={isConnected(def.id)}
                    isAvailable={def.isAvailable}
                    onConnect={() => handleConnect(def.id)}
                    onDisconnect={() => handleDisconnect(def.id)}
                    onSync={def.isAvailable && isConnected(def.id) ? () => handleSync(def.id) : undefined}
                    onConfigure={def.id === 'github' && isConnected(def.id) ? () => handleConfigure(def.id) : undefined}
                    isSyncing={syncing === def.id}
                    syncStatus={getConnectionStatus(def.id)}
                    features={def.features}
                    needsConfiguration={needsConfiguration(def.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Show all or connected with categories
            <div className="space-y-8">
              {(Object.keys(groupedDefinitions) as IntegrationCategory[]).map((category) => {
                const categoryDefs = activeCategory === 'connected'
                  ? groupedDefinitions[category].filter((d) => isConnected(d.id))
                  : groupedDefinitions[category];

                if (categoryDefs.length === 0) return null;

                return (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-2">
                      {CATEGORY_ICONS[category]}
                      <h2 className="text-lg font-semibold">
                        {INTEGRATION_CATEGORY_LABELS[category]}
                      </h2>
                      <Badge variant="secondary">{categoryDefs.length}</Badge>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {categoryDefs.map((def) => (
                        <IntegrationCard
                          key={def.id}
                          id={def.id}
                          name={def.name}
                          description={def.description}
                          icon={INTEGRATION_ICONS[def.icon] || <Globe className="h-5 w-5" />}
                          isConnected={isConnected(def.id)}
                          isAvailable={def.isAvailable}
                          onConnect={() => handleConnect(def.id)}
                          onDisconnect={() => handleDisconnect(def.id)}
                          onSync={def.isAvailable && isConnected(def.id) ? () => handleSync(def.id) : undefined}
                          onConfigure={def.id === 'github' && isConnected(def.id) ? () => handleConfigure(def.id) : undefined}
                          isSyncing={syncing === def.id}
                          syncStatus={getConnectionStatus(def.id)}
                          features={def.features}
                          needsConfiguration={needsConfiguration(def.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Stats Footer */}
      {connectedCount > 0 && (
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {(() => {
                    const syncTimes = connectedIntegrations
                      .filter((i) => i.lastSyncAt)
                      .map((i) => new Date(i.lastSyncAt!).getTime());
                    if (syncTimes.length === 0) return 'No syncs yet';
                    const mostRecent = Math.max(...syncTimes);
                    const diffMs = Date.now() - mostRecent;
                    const diffMins = Math.floor(diffMs / 60000);
                    if (diffMins < 1) return 'Last sync: Just now';
                    if (diffMins < 60) return `Last sync: ${diffMins}m ago`;
                    const diffHours = Math.floor(diffMins / 60);
                    if (diffHours < 24) return `Last sync: ${diffHours}h ago`;
                    return `Last sync: ${Math.floor(diffHours / 24)}d ago`;
                  })()}
                </span>
              </div>
              {connectedIntegrations.some((i) => i.totalItemsSynced) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {connectedIntegrations.reduce((sum, i) => sum + (i.totalItemsSynced || 0), 0)} items synced
                  </span>
                </div>
              )}
              {connectedIntegrations.some((i) => i.error) && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Some integrations have errors</span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => fetchIntegrations()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        </div>
      )}

      {/* GitHub Repo Selector Dialog */}
      <GitHubRepoSelector
        open={githubRepoSelectorOpen}
        onOpenChange={setGithubRepoSelectorOpen}
        onSave={() => fetchIntegrations()}
      />
    </div>
  );
}
