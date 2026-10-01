from pydantic import ConfigDict
from sqlmodel import SQLModel


# ---------------------------------------------------------------------------
# Spoonacular response schema (used for validation + OpenAPI docs)
# ---------------------------------------------------------------------------
class SpoonacularModel(SQLModel):
    """Base for all Spoonacular schemas: keep unknown fields instead of dropping."""

    model_config = ConfigDict(extra="allow")


# --- extendedIngredients ---------------------------------------------------
class Measure(SpoonacularModel):
    amount: float
    unitShort: str = ""
    unitLong: str = ""


class Measures(SpoonacularModel):
    us: Measure
    metric: Measure


class IngredientItem(SpoonacularModel):
    id: int
    aisle: str | None = None
    image: str | None = None
    consistency: str | None = None
    name: str
    nameClean: str | None = None
    original: str
    originalName: str | None = None
    amount: float
    unit: str = ""
    meta: list[str] = []
    measures: Measures


# --- winePairing -------------------------------------------------------------
class WineProductMatch(SpoonacularModel):
    id: int
    title: str
    description: str | None = None
    price: str | None = None
    imageUrl: str | None = None
    averageRating: float | None = None
    ratingCount: float | None = None
    score: float | None = None
    link: str | None = None


class WinePairing(SpoonacularModel):
    pairedWines: list[str] = []
    pairingText: str = ""
    productMatches: list[WineProductMatch] = []


# --- analyzedInstructions ----------------------------------------------------
class StepIngredient(SpoonacularModel):
    id: int
    name: str
    localizedName: str | None = None
    image: str | None = None


class StepTemperature(SpoonacularModel):
    number: float
    unit: str


class StepEquipment(SpoonacularModel):
    id: int
    name: str
    localizedName: str | None = None
    image: str | None = None
    temperature: StepTemperature | None = None


class StepLength(SpoonacularModel):
    number: float
    unit: str


class InstructionStep(SpoonacularModel):
    number: int
    step: str
    ingredients: list[StepIngredient] = []
    equipment: list[StepEquipment] = []
    length: StepLength | None = None


class AnalyzedInstruction(SpoonacularModel):
    name: str = ""
    steps: list[InstructionStep] = []


# --- top level ---------------------------------------------------------------
class Recipe(SpoonacularModel):
    id: int
    title: str | None = None
    image: str | None = None
    imageType: str | None = None
    readyInMinutes: int | None = None
    servings: int | None = None
    sourceUrl: str | None = None
    sourceName: str | None = None
    creditsText: str | None = None
    license: str | None = None
    language: str | None = None

    vegetarian: bool = False
    vegan: bool = False
    glutenFree: bool = False
    dairyFree: bool = False
    veryHealthy: bool = False
    cheap: bool = False
    veryPopular: bool = False
    sustainable: bool = False
    lowFodmap: bool = False

    weightWatcherSmartPoints: int | None = None
    gaps: str | None = None
    preparationMinutes: int | None = None
    cookingMinutes: int | None = None
    aggregateLikes: int | None = None
    healthScore: float | None = None
    pricePerServing: float | None = None
    spoonacularScore: float | None = None
    spoonacularSourceUrl: str | None = None

    extendedIngredients: list[IngredientItem] = []
    summary: str | None = None
    cuisines: list[str] = []
    dishTypes: list[str] = []
    diets: list[str] = []
    occasions: list[str] = []
    winePairing: WinePairing | None = None
    instructions: str | None = None
    analyzedInstructions: list[AnalyzedInstruction] = []
