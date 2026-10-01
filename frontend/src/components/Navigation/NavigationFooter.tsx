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

  const allItems = [
    ...items,
    { icon: User, title: "Settings", path: "/settings" },
  ]

  return (
    <footer className="border-t flex mx-1 mt-auto mb-6">
      {allItems.map((item) => {
        const isActive = currentPath === item.path

        return (
          <Link
            key={item.title}
            to={item.path}
            className={`basis-0 grow py-1 my-1 mx-0.5 rounded-xl flex flex-col justify-center items-center ${isActive ? "bg-primary text-background" : ""}`}
          >
            <item.icon />
          </Link>
        )
      })}
    </footer>
  )
}
