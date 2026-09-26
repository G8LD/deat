"use client";

import { Link as RouterLink, useRouterState } from "@tanstack/react-router";
import { Item } from "./NavigationLayout";
import { User } from "lucide-react";

interface NavigationFooterProps {
  items: Item[];
}

export function NavigationFooter({ items }: NavigationFooterProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const allItems = [...items, { icon: User, title: "Settings", path: "/settings" }];

  return (
    <footer className="border-t flex mx-1 mt-auto">
      {allItems.map((item) => {
        const isActive = currentPath === item.path;

        return (
          <RouterLink
            key={item.title}
            to={item.path}
            className={`basis-0 grow py-1 my-1 mx-0.5 rounded-xl flex flex-col justify-center items-center ${isActive ? "bg-accent" : ""}`}
          >
            <item.icon />
          </RouterLink>
        );
      })}
    </footer>
  );
}
