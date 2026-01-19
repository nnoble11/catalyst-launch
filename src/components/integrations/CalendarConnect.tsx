'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, ExternalLink, Calendar, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarConnectionStatus {
  connected: boolean;
  expiresAt: string | null;
}

interface SyncStatus {
  status: string;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  totalItemsSynced: number;
  errorCount: number;
  lastError: string | null;
}

export function CalendarConnect() {
  const [status, setStatus] = useState<CalendarConnectionStatus | null>(null);
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
      const response = await fetch('/api/integrations/google-calendar');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch Google Calendar status');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/integrations/google-calendar/sync');
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
      const response = await fetch('/api/integrations/google-calendar/sync', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Synced ${data.data.itemsCreated + data.data.itemsUpdated} calendar events`);
        await fetchSyncStatus();
      } else {
        toast.error(data.error || 'Failed to sync');
      }
    } catch {
      toast.error('Failed to sync Google Calendar');
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
      const response = await fetch('/api/integrations/google-calendar/auth');
      const data = await response.json();
      if (data.success) {
        // Store state for verification
        sessionStorage.setItem('google_oauth_state', data.data.state);
        // Redirect to Google OAuth
        window.location.href = data.data.authUrl;
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to initiate Google Calendar connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/integrations/google-calendar', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setStatus({ connected: false, expiresAt: null });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to disconnect Google Calendar');
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border">
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg">Google Calendar</CardTitle>
              <CardDescription>
                Block focus time and sync milestone reminders
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

        {status?.connected ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Calendar Access</p>
                    <p className="text-sm text-muted-foreground">
                      Your primary Google Calendar is connected
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
                    <span>{syncStatus.totalItemsSynced} events synced</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Features enabled:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Import calendar events for AI context
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Block focus time automatically
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Milestone due date reminders
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Schedule breakthrough sessions
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
                  Disconnect Google Calendar
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar to automatically block focus time
              for deep work, get milestone reminders, and schedule breakthrough
              sessions when you&apos;re stuck.
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
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
