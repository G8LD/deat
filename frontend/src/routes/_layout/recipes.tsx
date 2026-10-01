import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MenusService } from "@/client";
import RecipCarousel from "@/components/RecipeCarousel";
import RecipeCard from "@/components/RecipeCard";
import { Title } from "@/components/Title";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

function getMenusQueryOptions() {
  return {
    queryFn: async () => (await MenusService.readMenus({ query: { skip: 0, limit: 100 } })).data,
    queryKey: ["items"],
  };
}

export const Route = createFileRoute("/_layout/recipes")({
  component: Recipes,
  head: () => ({
    meta: [
      {
        title: "Recipes",
      },
    ],
  }),
});

function Recipes() {
  const { data: menus } = useSuspenseQuery(getMenusQueryOptions());
  let favorites = null;
  const allMenus = menus.data.filter((menu) => {
    if (menu.name === "Favorites") favorites = menu;
    return menu.name !== "Favorites";
  });
  return (
    <div>
      <Title>Recipes</Title>
      {favorites && (
        <RecipCarousel
          title={favorites.name}
          titleLink={`/menus/${favorites.id}`}
          data={favorites.recipes}
          card={RecipeCard}
        />
      )}
      <Title variant="section" className="mb-3 flex gap-3 items-center justify-between lg:justify-start">
        Menus
        <Button size="sm">
          <Plus />
          New
        </Button>
      </Title>
      {allMenus.map((menu) => (
        <RecipCarousel
          key={menu.id}
          title={menu.name}
          titleLink={`/menus/${menu.id}`}
          data={menu.recipes || []}
          card={RecipeCard}
        />
      ))}
    </div>
  );
}
