import { createFileRoute } from "@tanstack/react-router"
import { Logo } from "@/components/Common/Logo"
import { SearchBar } from "@/components/Common/SearchBar"
import { Title } from "@/components/Title"

export const Route = createFileRoute("/_layout/")({
  component: Home,
})

function Home() {
  return (
    <div>
      <Title>
        Search
      </Title>
      <SearchBar />
    </div>
  )
}
