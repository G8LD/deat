import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router"
import ErrorComponent from "@/components/Common/ErrorComponent"
import NotFound from "@/components/Common/NotFound"
import { TooltipProvider } from "@/components/ui/tooltip"

export const Route = createRootRoute({
  component: () => (
    <TooltipProvider>
      <HeadContent />
      <Outlet />
      {/* <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} /> */}
    </TooltipProvider>
  ),
  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
})
