'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Lightbulb,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Decision, DecisionCategory, DecisionStatus } from '@/types';

interface DecisionCardProps {
  decision: Decision;
  onDecide?: (decisionId: string, status: DecisionStatus, decisionMade?: string) => void;
}

const CATEGORY_CONFIG: Record<DecisionCategory, { label: string; color: string }> = {
  product: { label: 'Product', color: 'bg-blue-500/10 text-blue-500' },
  growth: { label: 'Growth', color: 'bg-green-500/10 text-green-500' },
  fundraising: { label: 'Fundraising', color: 'bg-purple-500/10 text-purple-500' },
  team: { label: 'Team', color: 'bg-orange-500/10 text-orange-500' },
  operations: { label: 'Operations', color: 'bg-gray-500/10 text-gray-500' },
  legal: { label: 'Legal', color: 'bg-red-500/10 text-red-500' },
  finance: { label: 'Finance', color: 'bg-emerald-500/10 text-emerald-500' },
};

const STATUS_CONFIG: Record<DecisionStatus, { label: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending', icon: Clock },
  decided: { label: 'Decided', icon: CheckCircle2 },
  deferred: { label: 'Deferred', icon: MinusCircle },
  dismissed: { label: 'Dismissed', icon: XCircle },
};

export function DecisionCard({ decision, onDecide }: DecisionCardProps) {
  const [expanded, setExpanded] = useState(decision.status === 'pending');
  const [showDecisionInput, setShowDecisionInput] = useState(false);
  const [decisionText, setDecisionText] = useState('');

  const categoryConfig = CATEGORY_CONFIG[decision.category];
  const StatusIcon = STATUS_CONFIG[decision.status].icon;

  const getUrgencyColor = (score: number) => {
    if (score >= 8) return 'text-destructive';
    if (score >= 5) return 'text-warning';
    return 'text-muted-foreground';
  };

  const handleDecide = (status: DecisionStatus) => {
    if (onDecide) {
      onDecide(decision.id, status, status === 'decided' ? decisionText : undefined);
      setShowDecisionInput(false);
      setDecisionText('');
    }
  };

  return (
    <Card className={decision.status !== 'pending' ? 'opacity-80' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={categoryConfig.color}>
                {categoryConfig.label}
              </Badge>
              {decision.status !== 'pending' && (
                <Badge variant="outline" className="text-xs">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {STATUS_CONFIG[decision.status].label}
                </Badge>
              )}
            </div>
            <CardTitle className="text-base mt-2">{decision.title}</CardTitle>
            {decision.dueDate && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due {formatDistanceToNow(new Date(decision.dueDate))}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="text-center">
              <p className={`text-lg font-bold ${getUrgencyColor(decision.urgencyScore)}`}>
                {decision.urgencyScore}
              </p>
              <p className="text-[10px] text-muted-foreground">urgency</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{decision.impactScore}</p>
              <p className="text-[10px] text-muted-foreground">impact</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Context */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span>Why this matters now</span>
            </div>
            <p className="text-sm text-muted-foreground">{decision.context}</p>
          </div>

          {/* Tradeoffs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>Options & Tradeoffs</span>
            </div>
            {decision.tradeoffs.map((tradeoff, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 ${
                  tradeoff.recommended ? 'border-primary/50 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{tradeoff.option}</span>
                  {tradeoff.recommended && (
                    <Badge variant="default" className="text-xs">
                      <Lightbulb className="h-3 w-3 mr-1" />
                      Recommended
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-success font-medium mb-1">Pros</p>
                    <ul className="space-y-1">
                      {tradeoff.pros.map((pro, j) => (
                        <li key={j} className="text-muted-foreground flex items-start gap-1">
                          <span className="text-success">+</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-destructive font-medium mb-1">Cons</p>
                    <ul className="space-y-1">
                      {tradeoff.cons.map((con, j) => (
                        <li key={j} className="text-muted-foreground flex items-start gap-1">
                          <span className="text-destructive">-</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommended Action */}
          {decision.recommendedAction && (
            <div className="rounded-lg bg-primary/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                <ArrowRight className="h-4 w-4" />
                <span>AI Recommendation</span>
              </div>
              <p className="text-sm">{decision.recommendedAction}</p>
            </div>
          )}

          {/* Decision Made (if already decided) */}
          {decision.decisionMade && (
            <div className="rounded-lg bg-success/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-success mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>Your Decision</span>
              </div>
              <p className="text-sm">{decision.decisionMade}</p>
              {decision.decidedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Decided {formatDistanceToNow(new Date(decision.decidedAt))} ago
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {decision.status === 'pending' && onDecide && (
            <div className="space-y-3 pt-2">
              {showDecisionInput ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="What did you decide? (optional but recommended)"
                    value={decisionText}
                    onChange={(e) => setDecisionText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleDecide('decided')}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Confirm Decision
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowDecisionInput(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setShowDecisionInput(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Make Decision
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDecide('deferred')}>
                    <MinusCircle className="h-4 w-4 mr-1" />
                    Defer
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDecide('dismissed')}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
