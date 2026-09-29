import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isLoggedIn } from "@/hooks/useAuth";
import { NavigationLayout } from "@/components/Navigation/NavigationLayout";
import { SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function Layout() {
  return (
    <SidebarProvider className="p-3">
      <NavigationLayout>
        <Outlet />
      </NavigationLayout>
    </SidebarProvider>
  );
}
