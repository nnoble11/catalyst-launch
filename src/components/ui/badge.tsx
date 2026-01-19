import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Catalyst Labs Badge Component
 * - default: Orange accent
 * - secondary: Blue accent
 * - destructive: Red
 * - outline: Bordered
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        // Primary: Orange
        default:
          "border-transparent bg-[#FC6C00]/10 text-[#FC6C00] [a&]:hover:bg-[#FC6C00]/20",
        // Secondary: Blue
        secondary:
          "border-transparent bg-[#0077F9]/10 text-[#0077F9] [a&]:hover:bg-[#0077F9]/20",
        // Destructive: Red
        destructive:
          "border-transparent bg-red-500/10 text-red-500 [a&]:hover:bg-red-500/20",
        // Outline
        outline:
          "border-[#40424D] text-[#9DA2B3] bg-transparent [a&]:hover:bg-[#40424D]/50 [a&]:hover:text-[#EDEFF7]",
        // Success: Green
        success:
          "border-transparent bg-emerald-500/10 text-emerald-500 [a&]:hover:bg-emerald-500/20",
        // Warning: Yellow/Amber
        warning:
          "border-transparent bg-amber-500/10 text-amber-500 [a&]:hover:bg-amber-500/20",
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
