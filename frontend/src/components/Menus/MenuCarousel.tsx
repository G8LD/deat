import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight, ChevronLeftIcon, ChevronRightIcon, Pin } from "lucide-react"
import { useRef } from "react"
import type { MenuPublic } from "@/client"
import BaseCard from "@/components/Common/BaseCard"
import MenuCompletionBadge from "@/components/Menus/MenuCompletionBadge"
import RecipeCard from "@/components/Recipes/RecipeCard"
import { Title } from "@/components/Title"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { FAVORITES_MENU_NAME } from "@/lib/constants"

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
          <div className="flex gap-1 items-center">
            <MenuCompletionBadge recipes={menu.recipes || []} />
            {menu.current && (
              <Badge>
                <Pin data-icon="inline-start" />
                Current
              </Badge>
            )}
            {menu.name !== FAVORITES_MENU_NAME && (
              <div className="text-sm">
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
        <div className="shrink-0">
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
        className="scrollbar-none overflow-y-auto overflow-x-scroll overscroll-x-contain whitespace-nowrap scroll-smooth flex gap-4 pl-3 p-1"
      >
        {(menu.recipes || []).map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            menuId={menu.id}
            menuName={menu.name}
            onMenuUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["menus", "depth", 2] })
              queryClient.invalidateQueries({ queryKey: ["recipe", recipe.id] })
            }}
          />
        ))}
        <Link to="/menus/$menuId" params={{ menuId: menu.id }}>
          <BaseCard className="flex flex-row items-center justify-center">
            See all <ArrowRight />
          </BaseCard>
        </Link>
      </div>
    </div>
  )
}
