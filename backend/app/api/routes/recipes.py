from typing import Any

from fastapi import APIRouter, HTTPException

from app.models.recipes import SearchResult
from app.services import recipes

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("/search", response_model=SearchResult)
def search_recipes(
    q: str,
    offset: int = 0,
) -> Any:
    """
    Search recipes. offset is multiple of 20 only.
    """
    if offset % 20 != 0:
        raise HTTPException(422, "Offset can only be a multiple of 20.")
    return recipes.search_recipes(q.lower(), offset=offset)
