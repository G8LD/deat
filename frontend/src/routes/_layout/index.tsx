import { createFileRoute } from "@tanstack/react-router"
import { Logo } from "@/components/Common/Logo"
import { SearchBar } from "@/components/Common/SearchBar"

export const Route = createFileRoute("/_layout/")({
  component: Home,
})

function Home() {
  return (
    <div>
      <div className="w-full flex pb-6">
        <Logo />
      </div>
      <SearchBar />
    </div>
  )
}
