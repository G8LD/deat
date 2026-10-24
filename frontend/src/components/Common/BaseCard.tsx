import type React from "react"
import { Card } from "@/components/ui/card"

interface BaseCardProps {
  children: React.ReactNode
  className?: string
}

export default function BaseCard({ children, className = "" }: BaseCardProps) {
  return (
    <Card
      className={`group/card flex flex-col w-full h-full p-0 gap-0 overflow-hidden rounded-xl border border-border/70 bg-card transition-all duration-200 hover:shadow-md hover:border-border ${className}`}
    >
      {children}
    </Card>
  )
}
