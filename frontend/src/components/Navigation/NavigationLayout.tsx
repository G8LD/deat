import {
  CookingPot,
  Search,
  type LucideIcon,
  ShoppingCart,
  Users,
} from "lucide-react"
import { NavigationFooter } from "@/components/Navigation/NavigationFooter"
import AppSidebar from "@/components/Navigation/Sidebar/AppSidebar"
import { SidebarInset, useSidebar } from "@/components/ui/sidebar"
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
  const { isMobile } = useSidebar()

  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: Users, title: "Admin", path: "/admin" }]
    : baseItems

  return (
    <>
      {!isMobile && <AppSidebar items={items} />}
      <SidebarInset className="flex-1 p-4 overflow-hidden">
        {children}
        {isMobile && <NavigationFooter items={items} />}
      </SidebarInset>
    </>
  )
}
