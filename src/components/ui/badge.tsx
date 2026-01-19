import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Catalyst Labs Badge Component
 * Uses CSS variables for consistent theming.
 *
 * Variants:
 * - default: Primary orange accent
 * - secondary: Blue accent
 * - destructive: Red for errors/danger
 * - outline: Bordered, subtle
 * - success: Green for positive states
 * - warning: Amber for warnings
 * - priority-low/medium/high/urgent: Task priority indicators
 * - stage-ideation/mvp/gtm: Project stage indicators
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        // Primary: Orange (uses CSS var)
        default:
          "border-transparent bg-primary/10 text-primary [a&]:hover:bg-primary/20",
        // Secondary: Blue (uses CSS var)
        secondary:
          "border-transparent bg-secondary/10 text-secondary [a&]:hover:bg-secondary/20",
        // Destructive: Red (uses CSS var)
        destructive:
          "border-transparent bg-destructive/10 text-destructive [a&]:hover:bg-destructive/20",
        // Outline (uses CSS vars)
        outline:
          "border-border text-muted-foreground bg-transparent [a&]:hover:bg-muted [a&]:hover:text-foreground",
        // Success: Green (uses CSS var)
        success:
          "border-transparent bg-success/10 text-success [a&]:hover:bg-success/20",
        // Warning: Amber (uses CSS var)
        warning:
          "border-transparent bg-warning/10 text-warning [a&]:hover:bg-warning/20",
        // Priority variants (uses CSS vars)
        "priority-low":
          "border-transparent bg-priority-low-bg text-priority-low",
        "priority-medium":
          "border-transparent bg-priority-medium-bg text-priority-medium",
        "priority-high":
          "border-transparent bg-priority-high-bg text-priority-high",
        "priority-urgent":
          "border-transparent bg-priority-urgent-bg text-priority-urgent",
        // Stage variants (uses CSS vars)
        "stage-ideation":
          "border-transparent bg-stage-ideation-bg text-stage-ideation",
        "stage-mvp":
          "border-transparent bg-stage-mvp-bg text-stage-mvp",
        "stage-gtm":
          "border-transparent bg-stage-gtm-bg text-stage-gtm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
