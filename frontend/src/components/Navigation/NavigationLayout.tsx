import {
  CookingPot,
  House,
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
  { icon: House, title: "Home", path: "/" },
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
      <SidebarInset>
        <main className="flex-1 py-4 md:p-8">
          <div className="mx-auto h-full">{children}</div>
        </main>
        {isMobile && <NavigationFooter items={items} />}
      </SidebarInset>
    </>
  )
}
