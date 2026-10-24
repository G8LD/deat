import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Button } from "../ui/button"

interface BackButtonProps {
  variant?: "default" | "destructive" | "ghost" | "link" | "outline" | "secondary" | null | undefined
}

export function BackButton({ variant }: BackButtonProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  return (
    <Button
      variant={variant}
      size="icon"
      aria-label="Go back"
      onClick={() => {
        if (canGoBack) {
          router.history.back()
        } else {
          navigate({ to: "/recipes" })
        }
      }}
    >
      <ArrowLeft />
    </Button>
  )
}
