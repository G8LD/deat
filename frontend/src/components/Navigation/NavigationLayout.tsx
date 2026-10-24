import { CookingPot, type LucideIcon, Search, ShoppingCart, Users } from "lucide-react"
import { NavigationFooter } from "@/components/Navigation/NavigationFooter"
import AppSidebar from "@/components/Navigation/Sidebar/AppSidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import useAuth from "@/hooks/useAuth"

export type Item = {
  icon: LucideIcon
  title: string
  path: string
}

interface NavigationLayoutProps {
  children: React.ReactNode
}

const baseItems: Item[] = [
  { icon: Search, title: "Search", path: "/" },
  { icon: CookingPot, title: "Recipes", path: "/recipes" },
  { icon: ShoppingCart, title: "Groceries", path: "/groceries" },
]

export function NavigationLayout({ children }: NavigationLayoutProps) {
  const { user: currentUser } = useAuth()
  const isMobile = useIsMobile()

  const items = currentUser?.is_superuser ? [...baseItems, { icon: Users, title: "Admin", path: "/admin" }] : baseItems

  return (
    <>
      {!isMobile && <AppSidebar items={items} />}
      <SidebarInset className={`flex-1 min-w-0 m-3 sm:m-4 overflow-x-clip ${isMobile ? "mb-20" : ""}`}>
        {children}
        {isMobile && <NavigationFooter items={items} />}
      </SidebarInset>
    </>
  )
}
