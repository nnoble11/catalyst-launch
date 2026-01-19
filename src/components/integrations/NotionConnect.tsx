'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, ExternalLink, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface NotionMetadata {
  workspaceId: string;
  workspaceName: string;
  workspaceIcon?: string;
}

interface NotionConnectionStatus {
  connected: boolean;
  metadata: NotionMetadata | null;
}

interface SyncStatus {
  status: string;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  totalItemsSynced: number;
  errorCount: number;
  lastError: string | null;
}

export function NotionConnect() {
  const [status, setStatus] = useState<NotionConnectionStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  // Fetch sync status when connected
  useEffect(() => {
    if (status?.connected) {
      fetchSyncStatus();
    }
  }, [status?.connected]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/integrations/notion');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch Notion status');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/integrations/notion/sync');
      const data = await response.json();
      if (data.success && data.data) {
        setSyncStatus(data.data);
      }
    } catch {
      // Sync status fetch is non-critical
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/notion/sync', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Synced ${data.data.itemsCreated + data.data.itemsUpdated} Notion pages`);
        await fetchSyncStatus();
      } else {
        toast.error(data.error || 'Failed to sync');
      }
    } catch {
      toast.error('Failed to sync Notion');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/integrations/notion/auth');
      const data = await response.json();
      if (data.success) {
        // Store state for verification
        sessionStorage.setItem('notion_oauth_state', data.data.state);
        // Redirect to Notion OAuth
        window.location.href = data.data.authUrl;
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to initiate Notion connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/integrations/notion', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setStatus({ connected: false, metadata: null });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to disconnect Notion');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.453-.234 4.764 7.279v-6.44l-1.215-.14c-.093-.513.28-.886.747-.933l3.222-.187z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg">Notion</CardTitle>
              <CardDescription>
                Export documents directly to your Notion workspace
              </CardDescription>
            </div>
          </div>
          <Badge variant={status?.connected ? 'success' : 'outline'}>
            {status?.connected ? (
              <>
                <Check className="mr-1 h-3 w-3" />
                Connected
              </>
            ) : (
              'Not Connected'
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {status?.connected && status.metadata ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status.metadata.workspaceIcon && (
                    <span className="text-2xl">{status.metadata.workspaceIcon}</span>
                  )}
                  <div>
                    <p className="text-sm font-medium">Workspace</p>
                    <p className="text-sm text-muted-foreground">
                      {status.metadata.workspaceName}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync'}
                </Button>
              </div>
              {syncStatus && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last sync: {formatLastSync(syncStatus.lastSuccessfulSyncAt)}
                  </span>
                  {syncStatus.totalItemsSynced > 0 && (
                    <span>{syncStatus.totalItemsSynced} pages synced</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Features enabled:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Import Notion pages for AI context
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Export documents to Notion pages
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Search Notion pages
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Disconnect Notion
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Notion workspace to export your generated documents
              directly to Notion pages and keep everything organized.
            </p>

            <Button
              className="w-full"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect to Notion
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
