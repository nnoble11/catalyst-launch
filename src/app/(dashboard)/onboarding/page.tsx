'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Rocket,
  Target,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { STAGES, STAGE_LABELS, type Stage } from '@/config/constants';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Catalyst Launch',
    description: "Let's set up your first project and get you started.",
  },
  {
    id: 'project',
    title: 'Tell us about your startup',
    description: 'What are you building?',
  },
  {
    id: 'stage',
    title: 'Where are you in your journey?',
    description: 'Select your current stage.',
  },
  {
    id: 'goals',
    title: 'What are your goals?',
    description: "What do you want to achieve in the next 90 days?",
  },
];

const stageIcons: Record<Stage, React.ReactNode> = {
  ideation: <Lightbulb className="h-6 w-6" />,
  mvp: <Target className="h-6 w-6" />,
  gtm: <Rocket className="h-6 w-6" />,
};

const stageDescriptions: Record<Stage, string> = {
  ideation: 'Exploring ideas, validating problem, finding product-market fit',
  mvp: 'Building your minimum viable product, getting first users',
  gtm: 'Ready to launch, scaling your go-to-market strategy',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    problemStatement: '',
    targetAudience: '',
    stage: 'ideation' as Stage,
    goals: ['', '', ''],
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return formData.projectName.trim().length > 0;
      case 2:
        return true;
      case 3:
        return formData.goals.some((g) => g.trim().length > 0);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      // Create project
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.projectName,
          description: formData.description,
          stage: formData.stage,
          metadata: {
            problemStatement: formData.problemStatement,
            targetAudience: formData.targetAudience,
            goals: formData.goals.filter((g) => g.trim().length > 0),
          },
        }),
      });

      if (!projectResponse.ok) {
        throw new Error('Failed to create project');
      }

      const { data: project } = await projectResponse.json();

      // Mark onboarding as complete
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      toast.success('Welcome to Catalyst Launch!');
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <p className="mt-2 text-sm text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>

      <Card>
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold">{STEPS[currentStep].title}</h2>
          <p className="mt-2 text-muted-foreground">{STEPS[currentStep].description}</p>

          <div className="mt-8">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                    <Rocket className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <p className="text-center text-lg">
                  Catalyst Launch is your AI-powered cofounder.
                  We&apos;ll help you go from idea to launch with personalized
                  guidance, milestone tracking, and document generation.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4 text-center">
                    <Lightbulb className="mx-auto h-8 w-8 text-stage-ideation" />
                    <p className="mt-2 font-medium">AI Coaching</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <Target className="mx-auto h-8 w-8 text-primary" />
                    <p className="mt-2 font-medium">Milestone Tracking</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <Check className="mx-auto h-8 w-8 text-success" />
                    <p className="mt-2 font-medium">Document Generation</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    placeholder="My Awesome Startup"
                    value={formData.projectName}
                    onChange={(e) =>
                      setFormData({ ...formData, projectName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Brief Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What does your startup do?"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problem">Problem Statement</Label>
                  <Textarea
                    id="problem"
                    placeholder="What problem are you solving?"
                    value={formData.problemStatement}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        problemStatement: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input
                    id="audience"
                    placeholder="Who are you building this for?"
                    value={formData.targetAudience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetAudience: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                {STAGES.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setFormData({ ...formData, stage })}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors',
                      formData.stage === stage
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-lg',
                        formData.stage === stage
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {stageIcons[stage]}
                    </div>
                    <div>
                      <p className="font-semibold">{STAGE_LABELS[stage]}</p>
                      <p className="text-sm text-muted-foreground">
                        {stageDescriptions[stage]}
                      </p>
                    </div>
                    {formData.stage === stage && (
                      <Check className="ml-auto h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <p className="text-muted-foreground">
                  What do you want to accomplish in the next 90 days? These will
                  help us personalize your experience.
                </p>
                {formData.goals.map((goal, index) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`goal-${index}`}>Goal {index + 1}</Label>
                    <Input
                      id={`goal-${index}`}
                      placeholder={
                        index === 0
                          ? 'e.g., Validate my idea with 50 user interviews'
                          : index === 1
                            ? 'e.g., Build and launch MVP'
                            : 'e.g., Get first 100 users'
                      }
                      value={goal}
                      onChange={(e) => {
                        const newGoals = [...formData.goals];
                        newGoals[index] = e.target.value;
                        setFormData({ ...formData, goals: newGoals });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep === STEPS.length - 1 ? (
              <Button onClick={handleComplete} disabled={!canProceed() || loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
