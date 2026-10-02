import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { NavigationLayout } from "@/components/Navigation/NavigationLayout"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <NavigationLayout>
          <Outlet />
        </NavigationLayout>
      </TooltipProvider>
    </SidebarProvider>
  )
}
