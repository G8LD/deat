import { createFileRoute } from "@tanstack/react-router"
import { Title } from "@/components/Title"

export const Route = createFileRoute("/_layout/groceries")({
  component: Groceries,
  head: () => ({
    meta: [
      {
        title: "Groceries",
      },
    ],
  }),
})

function Groceries() {
  return (
    <div>
      <Title title="Groceries" />
    </div>
  )
}
