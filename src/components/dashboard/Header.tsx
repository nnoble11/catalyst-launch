'use client';

import { UserButton } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { Moon, Sun, Search, Command, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from './NotificationBell';
import { QuickCapture } from '@/components/capture/QuickCapture';
import { useSidebarStore } from '@/stores/sidebar-store';

export function Header() {
  const { setTheme, theme } = useTheme();
  const { toggle } = useSidebarStore();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      {/* Left side - Menu & Search */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search - hidden on mobile, simplified on tablet */}
        <button className="hidden sm:flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">Search...</span>
          <div className="hidden md:flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-xs">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </button>

        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Capture - hidden on small mobile */}
        <div className="hidden xs:block">
          <QuickCapture />
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'h-9 w-9 ring-2 ring-border hover:ring-primary transition-all',
              userButtonPopoverCard: 'bg-popover border border-border',
              userButtonPopoverActionButton: 'text-muted-foreground hover:bg-muted hover:text-foreground',
              userButtonPopoverActionButtonText: 'text-muted-foreground',
              userButtonPopoverFooter: 'hidden',
            },
          }}
        />
      </div>
    </header>
  );
}
