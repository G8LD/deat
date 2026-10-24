import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Dices, Pin } from "lucide-react"
import { useState } from "react"
import { MenusService } from "@/client"
import { BackButton } from "@/components/Common/BackButton"
import DeleteMenu from "@/components/Menus/DeleteMenu"
import MenuCompletionBadge from "@/components/Menus/MenuCompletionBadge"
import { MenuGroceries } from "@/components/Menus/MenuGroceries"
import RenameMenu from "@/components/Menus/RenameMenu"
import RecipeCard from "@/components/Recipes/RecipeCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useCustomToast from "@/hooks/useCustomToast"
import { FAVORITES_MENU_NAME } from "@/lib/constants"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/menus/$menuId")({
  component: MenuDetails,
})

function MenuDetails() {
  const { menuId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const [randomCount, setRandomCount] = useState("3")

  const { data: menu } = useSuspenseQuery({
    queryKey: ["menu", menuId],
    queryFn: async () => (await MenusService.readMenu({ path: { id: menuId }, query: { depth: 3 } })).data,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["menu", menuId] })

  const pinMenuMutation = useMutation({
    mutationFn: async () => await MenusService.updateMenu({ body: { current: true }, path: { id: menuId } }),
    onSuccess: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ["menus"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const addRandomMutation = useMutation({
    mutationFn: async () =>
      await MenusService.addRandomRecipesToMenu({
        path: { id: menuId },
        query: { count: Number(randomCount) },
      }),
    onSuccess: invalidate,
    onError: handleError.bind(showErrorToast),
  })

  const isFavorites = menu.name === FAVORITES_MENU_NAME
  const recipes = menu.recipes || []

  return (
    <div className="flex flex-col gap-4">
      <BackButton variant="outline" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <RenameMenu menu={menu} onSuccess={invalidate} />
          <div className="flex flex-wrap items-center gap-2">
            <MenuCompletionBadge recipes={recipes} />
            {menu.current && (
              <Badge>
                <Pin data-icon="inline-start" />
                Current
              </Badge>
            )}
            {menu.created_at && (
              <span className="text-sm">
                Created on{" "}
                {new Date(menu.created_at).toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="recipes" className="w-full">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="groceries">Groceries</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-1">
            {!menu.current && !isFavorites && (
              <Button variant="outline" onClick={() => pinMenuMutation.mutate()} disabled={pinMenuMutation.isPending}>
                <Pin data-icon="inline-start" />
                Pin as current
              </Button>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                onClick={() => addRandomMutation.mutate()}
                disabled={addRandomMutation.isPending}
              >
                <Dices /> Add random
              </Button>
              <Select value={randomCount} onValueChange={setRandomCount}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isFavorites && <DeleteMenu menu={menu} onSuccess={() => navigate({ to: "/recipes" })} />}
          </div>
        </div>

        <TabsContent value="recipes">
          {recipes.length === 0 ? (
            <div>Nothing in here</div>
          ) : (
            <div
              key={recipes.map((r) => r.id).join("-")}
              className="stagger-children grid justify-center gap-4 p-1 [grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(12rem,1fr))]"
            >
              {recipes.map((recipe) => (
                <div key={recipe.id} className="flex justify-center">
                  <RecipeCard recipe={recipe} menuId={menuId} onMenuUpdate={invalidate} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="groceries">
          <MenuGroceries menuId={menuId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
