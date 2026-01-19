'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, ExternalLink, Zap } from 'lucide-react';

interface SlackMetadata {
  teamId: string;
  teamName: string;
  slackUserId: string;
}

interface SlackConnectionStatus {
  connected: boolean;
  metadata: SlackMetadata | null;
}

export function SlackConnect() {
  const [status, setStatus] = useState<SlackConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/integrations/slack');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch Slack status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/integrations/slack/auth');
      const data = await response.json();
      if (data.success) {
        // Store state for verification
        sessionStorage.setItem('slack_oauth_state', data.data.state);
        // Redirect to Slack OAuth
        window.location.href = data.data.authUrl;
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to initiate Slack connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/integrations/slack', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setStatus({ connected: false, metadata: null });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to disconnect Slack');
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A154B]">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg">Slack</CardTitle>
              <CardDescription>
                Get daily check-ins and quick capture via Slack
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
                <div>
                  <p className="text-sm font-medium">Workspace</p>
                  <p className="text-sm text-muted-foreground">
                    {status.metadata.teamName}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  <Zap className="mr-1 h-3 w-3 text-yellow-500" />
                  Real-time
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Messages sync automatically via webhooks
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Features enabled:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Real-time message capture for AI context
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Daily check-in reminders via DM
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Quick capture from Slack
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  /catalyst slash command
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
                  Disconnect Slack
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Slack workspace to receive daily check-in prompts,
              capture ideas on the go, and get notified about milestones.
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
                  Connect to Slack
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
