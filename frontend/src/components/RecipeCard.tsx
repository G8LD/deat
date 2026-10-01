import { Link } from "@tanstack/react-router"
import { Clock, Utensils } from "lucide-react"
import type { Recipe } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RecipeCardProps {
  data: Recipe
}

export default function RecipeCard({ data: recipe }: RecipeCardProps) {
  return (
    <Link to={`/recipes/${recipe.id}`}>
      <Card className="w-36 lg:w-48 aspect-2/3 p-0 gap-0 h-full overflow-hidden ">
        <div className="h-45/100 overflow-hidden">
          <img src={recipe.image} alt={recipe.title} />
        </div>
        <CardHeader className="px-2 mt-1">
          <CardTitle className="text-xs lg:text-sm text-center text-wrap">
            {recipe.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-1 justify-center">
          <Badge>
            <Clock data-icon="inline-start" />
            {recipe.readyInMinutes} min
          </Badge>
          <Badge>
            <Utensils data-icon="inline-start" />
            {recipe.servings}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}
