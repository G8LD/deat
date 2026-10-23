import { AxiosError } from "axios"

function extractErrorMessage(err: Error): string {
  if (err instanceof AxiosError) {
    const errDetail = (err.response?.data as any)?.detail
    if (Array.isArray(errDetail) && errDetail.length > 0) {
      return errDetail[0].msg
    }
    if (typeof errDetail === "string") {
      return errDetail
    }
    return err.message
  }
  return "Something went wrong."
}

export const handleError = function (this: (msg: string) => void, err: Error) {
  const errorMessage = extractErrorMessage(err)
  this(errorMessage)
}

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Spoonacular image URLs
// Built from raw fields following Spoonacular's conventions so the whole app
// constructs image URLs the same way.
// ---------------------------------------------------------------------------

const SPOONACULAR_IMG = "https://img.spoonacular.com"

export type RecipeImageSize = "556x370" | "636x393" | "480x360" | "312x231"
export type IngredientImageSize = "100x100" | "250x250" | "500x500"

/** Build a recipe image URL from its id + imageType (e.g. "jpg"). */
export const buildRecipeImageUrl = (
  id: number,
  imageType: string | null | undefined,
  size: RecipeImageSize = "556x370",
): string => `${SPOONACULAR_IMG}/recipes/${id}-${size}.${imageType ?? "jpg"}`

/** Build an ingredient image URL from its bare filename (e.g. "flour.png"). */
export const buildIngredientImageUrl = (
  file: string | null | undefined,
  size: IngredientImageSize = "250x250",
): string | undefined => (file ? `${SPOONACULAR_IMG}/ingredients_${size}/${file}` : undefined)
