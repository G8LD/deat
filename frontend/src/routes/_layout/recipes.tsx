import { createFileRoute } from "@tanstack/react-router"
import { Title } from "@/components/Title"

export const Route = createFileRoute("/_layout/recipes")({
  component: Recipes,
  head: () => ({
    meta: [
      {
        title: "Recipes",
      },
    ],
  }),
})

function Recipes() {
  return (
    <div>
      <Title title="Recipes" />
      <Title title="Favorites" variant="section" />
    </div>
  )
}
