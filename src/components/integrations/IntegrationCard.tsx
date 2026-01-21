'use client';

import { useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Zap,
  ArrowLeftRight,
  Webhook,
  Clock,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface IntegrationFeatures {
  realtime?: boolean;
  bidirectional?: boolean;
  incrementalSync?: boolean;
  webhooks?: boolean;
}

interface SyncStatus {
  provider: string;
  connected: boolean;
  lastSyncAt?: string;
  error?: string;
}

interface IntegrationCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isAvailable: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
  onConfigure?: () => void;
  isSyncing?: boolean;
  syncStatus?: SyncStatus;
  features?: IntegrationFeatures;
  needsConfiguration?: boolean;
}

export function IntegrationCard({
  id,
  name,
  description,
  icon,
  isConnected,
  isAvailable,
  onConnect,
  onDisconnect,
  onSync,
  onConfigure,
  isSyncing,
  syncStatus,
  features,
  needsConfiguration,
}: IntegrationCardProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!isAvailable) {
      toast.info('This integration is coming soon!');
      return;
    }

    if (!onConnect) return;

    setLoading(true);
    try {
      await onConnect();
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect integration');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;

    setLoading(true);
    try {
      await onDisconnect();
      toast.success('Integration disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect integration');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!onSync) return;
    await onSync();
  };

  // Format last sync time
  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return null;
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

  return (
    <Card className={!isAvailable ? 'opacity-60' : ''}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            {!isAvailable && (
              <Badge variant="secondary" className="mt-1">
                Coming Soon
              </Badge>
            )}
          </div>
        </div>
        {isConnected ? (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="outline">
            <XCircle className="mr-1 h-3 w-3" />
            Not Connected
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription className="min-h-[40px]">{description}</CardDescription>

        {/* Features badges */}
        {features && isAvailable && (
          <div className="flex flex-wrap gap-1.5">
            <TooltipProvider>
              {features.realtime && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      <Zap className="mr-1 h-3 w-3 text-warning" />
                      Real-time
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Syncs data in real-time via webhooks</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {features.bidirectional && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      <ArrowLeftRight className="mr-1 h-3 w-3 text-secondary" />
                      Two-way
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Changes sync both directions</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {features.webhooks && !features.realtime && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      <Webhook className="mr-1 h-3 w-3 text-stage-ideation" />
                      Webhooks
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Supports webhook notifications</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        )}

        {/* Sync status for connected integrations */}
        {isConnected && syncStatus?.lastSyncAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last sync: {formatLastSync(syncStatus.lastSyncAt)}</span>
          </div>
        )}

        {/* Error message */}
        {syncStatus?.error && (
          <div className="text-xs text-destructive">
            Sync error: {syncStatus.error}
          </div>
        )}

        {/* Needs Configuration Warning */}
        {isConnected && needsConfiguration && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Configuration required to start syncing</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Disconnect
              </Button>
              {onConfigure && (
                <Button
                  variant={needsConfiguration ? 'default' : 'ghost'}
                  size="sm"
                  onClick={onConfigure}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Button>
              )}
              {onSync && !needsConfiguration && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </Button>
              )}
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={loading || !isAvailable}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
