import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight, ChevronLeftIcon, ChevronRightIcon, Pin } from "lucide-react"
import { useRef } from "react"
import type { MenuPublic } from "@/client"
import BaseCard from "@/components/Common/BaseCard"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { FAVORITES_MENU_NAME } from "@/lib/constants"
import RecipeCard from "../Recipes/RecipeCard"
import { Title } from "../Title"
import { Badge } from "../ui/badge"
import MenuCompletionBadge from "./MenuCompletionBadge"

interface MenuCarouselProps {
  menu: MenuPublic
}

export default function MenuCarousel({ menu }: MenuCarouselProps) {
  const queryClient = useQueryClient()
  const section = useRef<HTMLDivElement>(null)
  const slider = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  function handleClick(direction: number) {
    if (!slider.current || !section.current) return
    slider.current.scrollLeft += direction * section.current.clientWidth
  }

  return (
    <div ref={section}>
      <div className="flex items-end justify-between">
        <div className="mb-2">
          <Title variant="section">
            <Link to="/menus/$menuId" params={{ menuId: menu.id }} className="flex items-center gap-1">
              {menu.name} <ArrowRight className="shrink-0" />
            </Link>
          </Title>
          <div className="flex gap-1.5 items-center">
            <MenuCompletionBadge recipes={menu.recipes || []} />
            {menu.current && (
              <Badge>
                <Pin data-icon="inline-start" />
                Current
              </Badge>
            )}
            {menu.name !== FAVORITES_MENU_NAME && (
              <div className="text-sm text-muted-foreground">
                {isMobile ? (
                  new Date(menu.created_at || "").toLocaleString("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })
                ) : (
                  <>
                    Created on{" "}
                    {new Date(menu.created_at ?? "").toLocaleString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <Button variant="ghost" size="icon" aria-label="Scroll left" onClick={() => handleClick(-1)}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Scroll right" onClick={() => handleClick(1)}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
      <div
        ref={slider}
        className="scrollbar-none overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth flex items-stretch gap-4 py-2 px-1"
      >
        {(menu.recipes || []).map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            menuId={menu.id}
            isFavorites={menu.name === FAVORITES_MENU_NAME}
            className="w-44 sm:w-48 shrink-0 flex flex-col"
            onMenuUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["menus", "depth", 2] })
              queryClient.invalidateQueries({ queryKey: ["recipe", recipe.id] })
            }}
          />
        ))}
        <Link to="/menus/$menuId" params={{ menuId: menu.id }} className="w-44 sm:w-48 shrink-0 flex">
          <BaseCard className="w-full h-full flex flex-col items-center justify-center p-4 text-center hover:bg-accent/40 transition-colors">
            <span className="font-medium text-sm flex items-center gap-1.5">
              See all <ArrowRight className="size-4" />
            </span>
          </BaseCard>
        </Link>
      </div>
    </div>
  )
}
