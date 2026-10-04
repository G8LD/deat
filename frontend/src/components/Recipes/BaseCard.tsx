import type React from "react"
import { Card } from "@/components/ui/card"

interface BaseCardProps {
  children: React.ReactNode
  className?: string
}

export default function BaseCard({ children, className = "" }: BaseCardProps) {
  return (
    <Card className={`shrink-0 w-40 lg:w-48 aspect-2/3 p-0 gap-0 h-full overflow-hidden ${className}`}>{children}</Card>
  )
}
