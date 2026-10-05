import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/recipes")({
  component: RecipesLayout,
})

function RecipesLayout() {
  return <Outlet />
}
