import { createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"
import { SearchBar } from "@/components/Common/SearchBar"

export const Route = createFileRoute("/_layout/")({
  component: Home,
})

function Home() {
  const { user: currentUser } = useAuth()

  return (
    <div>
      <div>
        <h1 className="text-2xl truncate max-w-sm mb-2">
          Hi, {currentUser?.full_name || currentUser?.email} !
        </h1>
        <SearchBar />
      </div>
    </div>
  )
}
