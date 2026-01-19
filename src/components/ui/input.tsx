import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Catalyst Labs Input Component
 * Uses CSS variables for proper light/dark mode support
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "h-10 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm text-foreground",
        // Border
        "border-input",
        // Placeholder
        "placeholder:text-muted-foreground",
        // Shadow and transition
        "shadow-sm transition-all duration-200",
        // Focus states
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
        // Selection
        "selection:bg-primary selection:text-primary-foreground",
        // File input
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled state
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid state
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
