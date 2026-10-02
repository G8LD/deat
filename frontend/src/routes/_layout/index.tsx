import { createFileRoute } from "@tanstack/react-router"
import { SearchBar } from "@/components/Common/SearchBar"
import { Title } from "@/components/Title"

export const Route = createFileRoute("/_layout/")({
  component: Home,
})

function Home() {
  return (
    <div>
      <Title>Search</Title>
      <SearchBar />
    </div>
  )
}
