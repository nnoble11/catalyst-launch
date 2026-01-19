'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Rocket, Brain, FileText, Users, Zap, BarChart3, Calendar, Target } from 'lucide-react';

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/projects');
    }
  }, [isLoaded, isSignedIn, router]);

  // Loading state
  if (!isLoaded || isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040F13]">
        <div className="relative">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#40424D] border-t-[#FC6C00]" />
          <div className="absolute inset-0 animate-ping rounded-full border-4 border-[#FC6C00]/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040F13]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#40424D]/50 bg-[#040F13]/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FC6C00]">
              <span className="text-xl font-bold text-white">C</span>
            </div>
            <span className="text-xl font-bold text-[#EDEFF7]">Catalyst Launch</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-[#9DA2B3] hover:text-[#EDEFF7] hover:bg-[#40424D]/50"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-[#FC6C00] text-white hover:bg-[#FC6C00]/90 shadow-lg shadow-[#FC6C00]/20">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#FC6C00]/10 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#0077F9]/10 blur-[100px]" />
        </div>

        <div className="container relative mx-auto px-6">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#40424D] bg-[#1E1E24]/50 px-4 py-2 backdrop-blur">
              <Zap className="h-4 w-4 text-[#FC6C00]" />
              <span className="text-sm text-[#9DA2B3]">Your AI-Powered Cofounder</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-bold tracking-tight text-[#EDEFF7] sm:text-6xl lg:text-7xl">
              Build your startup
              <span className="relative">
                <span className="bg-gradient-to-r from-[#FC6C00] to-[#0077F9] bg-clip-text text-transparent">
                  {' '}faster
                </span>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg leading-8 text-[#9DA2B3] max-w-2xl mx-auto">
              Catalyst Launch is your AI-powered cofounder. Get personalized
              guidance, generate professional documents, and track your progress from
              idea to launch.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-[#FC6C00] text-white hover:bg-[#FC6C00]/90 shadow-lg shadow-[#FC6C00]/20 h-12 px-8 text-base"
                >
                  Start Building
                  <Rocket className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#40424D] text-[#EDEFF7] hover:bg-[#40424D]/50 hover:border-[#6E7180] h-12 px-8 text-base"
                >
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-[#40424D]/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#EDEFF7] sm:text-4xl">
              Everything you need to launch
            </h2>
            <p className="mt-4 text-[#9DA2B3] max-w-2xl mx-auto">
              From ideation to launch, Catalyst provides the tools and guidance you need
              to build a successful startup.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {/* Feature Card 1 */}
            <div className="group relative rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#FC6C00]/50 hover:bg-[#1E1E24]">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FC6C00]/10 group-hover:bg-[#FC6C00]/20 transition-colors">
                <Brain className="h-6 w-6 text-[#FC6C00]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#EDEFF7]">AI Coach</h3>
              <p className="mt-2 text-sm text-[#9DA2B3] leading-relaxed">
                Get personalized advice and actionable tasks tailored to your
                startup&apos;s current stage and challenges.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="group relative rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#0077F9]/50 hover:bg-[#1E1E24]">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0077F9]/10 group-hover:bg-[#0077F9]/20 transition-colors">
                <FileText className="h-6 w-6 text-[#0077F9]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#EDEFF7]">
                Document Generation
              </h3>
              <p className="mt-2 text-sm text-[#9DA2B3] leading-relaxed">
                Generate pitch decks, PRDs, and go-to-market plans with AI that
                understands your startup.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="group relative rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#FC6C00]/50 hover:bg-[#1E1E24]">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FC6C00]/10 group-hover:bg-[#FC6C00]/20 transition-colors">
                <BarChart3 className="h-6 w-6 text-[#FC6C00]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#EDEFF7]">
                Progress Analytics
              </h3>
              <p className="mt-2 text-sm text-[#9DA2B3] leading-relaxed">
                Track your milestones, visualize progress, and get AI-powered
                predictions on your startup journey.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="group relative rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#0077F9]/50 hover:bg-[#1E1E24]">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0077F9]/10 group-hover:bg-[#0077F9]/20 transition-colors">
                <Calendar className="h-6 w-6 text-[#0077F9]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#EDEFF7]">
                Smart Scheduling
              </h3>
              <p className="mt-2 text-sm text-[#9DA2B3] leading-relaxed">
                Integrate with Google Calendar, Slack, and Notion to keep your
                team aligned and focused.
              </p>
            </div>

            {/* Feature Card 5 */}
            <div className="group relative rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#FC6C00]/50 hover:bg-[#1E1E24]">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FC6C00]/10 group-hover:bg-[#FC6C00]/20 transition-colors">
                <Zap className="h-6 w-6 text-[#FC6C00]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#EDEFF7]">
                Proactive Coaching
              </h3>
              <p className="mt-2 text-sm text-[#9DA2B3] leading-relaxed">
                Get notified when you&apos;re stuck, receive daily check-ins, and
                build momentum with streaks and achievements.
              </p>
            </div>

            {/* Feature Card 6 */}
            <div className="group relative rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#0077F9]/50 hover:bg-[#1E1E24]">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0077F9]/10 group-hover:bg-[#0077F9]/20 transition-colors">
                <Users className="h-6 w-6 text-[#0077F9]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#EDEFF7]">
                Community
              </h3>
              <p className="mt-2 text-sm text-[#9DA2B3] leading-relaxed">
                Share your ideas, get feedback from the community, and discover
                trending startup concepts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 border-t border-[#40424D]/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#EDEFF7] sm:text-4xl">
              Connects with your favorite tools
            </h2>
            <p className="mt-4 text-[#9DA2B3] max-w-2xl mx-auto">
              Seamlessly integrate with the tools you already use to keep your workflow unified.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {/* Google Calendar */}
            <div className="group flex flex-col items-center gap-3 rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#FC6C00]/50 hover:bg-[#1E1E24]">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#040F13] border border-[#40424D] group-hover:border-[#FC6C00]/30">
                <Calendar className="h-7 w-7 text-[#FC6C00]" />
              </div>
              <div className="text-center">
                <p className="font-medium text-[#EDEFF7]">Google Calendar</p>
                <p className="text-xs text-[#6E7180] mt-1">Sync meetings & deadlines</p>
              </div>
            </div>

            {/* Notion */}
            <div className="group flex flex-col items-center gap-3 rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#0077F9]/50 hover:bg-[#1E1E24]">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#040F13] border border-[#40424D] group-hover:border-[#0077F9]/30">
                <FileText className="h-7 w-7 text-[#0077F9]" />
              </div>
              <div className="text-center">
                <p className="font-medium text-[#EDEFF7]">Notion</p>
                <p className="text-xs text-[#6E7180] mt-1">Connect your workspace</p>
              </div>
            </div>

            {/* Slack */}
            <div className="group flex flex-col items-center gap-3 rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#FC6C00]/50 hover:bg-[#1E1E24]">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#040F13] border border-[#40424D] group-hover:border-[#FC6C00]/30">
                <Users className="h-7 w-7 text-[#FC6C00]" />
              </div>
              <div className="text-center">
                <p className="font-medium text-[#EDEFF7]">Slack</p>
                <p className="text-xs text-[#6E7180] mt-1">Team notifications</p>
              </div>
            </div>

            {/* Linear */}
            <div className="group flex flex-col items-center gap-3 rounded-xl border border-[#40424D] bg-[#1E1E24]/50 p-6 transition-all duration-300 hover:border-[#0077F9]/50 hover:bg-[#1E1E24]">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#040F13] border border-[#40424D] group-hover:border-[#0077F9]/30">
                <Target className="h-7 w-7 text-[#0077F9]" />
              </div>
              <div className="text-center">
                <p className="font-medium text-[#EDEFF7]">Linear</p>
                <p className="text-xs text-[#6E7180] mt-1">Track product tasks</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-[#40424D]/50">
        <div className="container mx-auto px-6">
          <div className="relative mx-auto max-w-4xl rounded-2xl border border-[#40424D] bg-gradient-to-br from-[#1E1E24] to-[#040F13] p-12 text-center overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-64 bg-[#FC6C00]/20 blur-[80px]" />

            <h2 className="relative text-3xl font-bold text-[#EDEFF7] sm:text-4xl">
              Ready to launch your startup?
            </h2>
            <p className="relative mt-4 text-[#9DA2B3] max-w-xl mx-auto">
              Join thousands of founders using Catalyst Launch to build and scale
              their startups with AI-powered guidance.
            </p>
            <div className="relative mt-8">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-[#FC6C00] text-white hover:bg-[#FC6C00]/90 shadow-lg shadow-[#FC6C00]/20 h-12 px-8 text-base"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#40424D]/50 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FC6C00]">
                <span className="text-sm font-bold text-white">C</span>
              </div>
              <span className="text-sm font-medium text-[#9DA2B3]">
                Catalyst Launch
              </span>
            </div>
            <p className="text-sm text-[#6E7180]">
              Built by Catalyst Labs
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
