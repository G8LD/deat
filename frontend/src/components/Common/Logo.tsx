import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({ variant = "full", className, asLink = true }: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <span
          className={cn(
            "text-xl font-bold tracking-tight text-foreground group-data-[collapsible=icon]:hidden",
            className,
          )}
        >
          Deat
        </span>
        <span className={cn("hidden text-lg font-bold text-foreground group-data-[collapsible=icon]:block", className)}>
          D
        </span>
      </>
    ) : (
      <span
        className={cn(
          "font-bold tracking-tight text-foreground",
          variant === "full" ? "text-9xl" : "text-lg",
          className,
        )}
      >
        {variant === "full" ? "Deat" : "D"}
      </span>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
