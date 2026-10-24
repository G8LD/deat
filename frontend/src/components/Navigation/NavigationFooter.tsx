"use client"

import { Link, useRouterState } from "@tanstack/react-router"
import { User } from "lucide-react"
import type { Item } from "./NavigationLayout"

interface NavigationFooterProps {
  items: Item[]
}

export function NavigationFooter({ items }: NavigationFooterProps) {
  const router = useRouterState()
  const currentPath = router.location.pathname

  const allItems = [...items, { icon: User, title: "Settings", path: "/settings" }]

  return (
    <footer className="fixed border-t flex px-2 py-1.5 bottom-0 right-0 left-0 bg-background/95 backdrop-blur-sm z-50 shadow-md">
      {allItems.map((item) => {
        const isActive = currentPath === item.path

        return (
          <Link
            key={item.title}
            to={item.path}
            aria-label={item.title}
            aria-current={isActive ? "page" : undefined}
            className={`basis-0 grow min-h-[48px] py-1 px-1 rounded-xl flex flex-col justify-center items-center gap-1 transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            <item.icon className="size-5 shrink-0" />
            <span className="text-[10px] leading-tight tracking-tight">{item.title}</span>
          </Link>
        )
      })}
    </footer>
  )
}
