"""Seed the `ingredient` table from the bundled Spoonacular CSV.

The CSV is semicolon-delimited with no header, one ingredient per line:

    name;spoonacular_id;unit1,unit2,...

Seeding is idempotent: existing rows are updated with the canonical name /
possible units without clobbering an `image`/`aisle` learned from a recipe
fetch.
"""

import csv
import logging
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import Session, func, select

from app.models.ingredients import Ingredient

logger = logging.getLogger(__name__)

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "ingredients.csv"


def parse_ingredients_csv(path: Path = CSV_PATH) -> list[dict]:
    """Parse the CSV into ingredient value dicts, deduped by id (last wins).

    The CSV contains duplicate ids; a single INSERT ... ON CONFLICT DO UPDATE
    cannot touch the same row twice, so we collapse duplicates here.
    """
    by_id: dict[int, dict] = {}
    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh, delimiter=";")
        for line in reader:
            if len(line) < 2:
                continue
            name, raw_id = line[0].strip(), line[1].strip()
            if not raw_id.isdigit():
                continue
            units = (
                [u.strip() for u in line[2].split(",") if u.strip()]
                if len(line) > 2
                else []
            )
            ingredient_id = int(raw_id)
            by_id[ingredient_id] = {
                "id": ingredient_id,
                "name": name,
                "possible_units": units,
            }
    return list(by_id.values())


def seed_ingredients(session: Session, path: Path = CSV_PATH) -> int:
    """Idempotently upsert ingredients from the CSV. Returns row count seeded."""
    if not path.exists():
        logger.warning("Ingredient CSV not found at %s; skipping seed", path)
        return 0

    rows = parse_ingredients_csv(path)
    if not rows:
        return 0

    # Upsert in chunks; update only name + possible_units on conflict so we
    # don't erase image/aisle learned from recipe fetches.
    chunk = 500
    for start in range(0, len(rows), chunk):
        batch = rows[start : start + chunk]
        stmt = pg_insert(Ingredient).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Ingredient.id],
            set_={
                "name": stmt.excluded.name,
                "possible_units": stmt.excluded.possible_units,
            },
        )
        session.exec(stmt)  # type: ignore[call-overload]
    session.commit()

    total = session.exec(select(func.count()).select_from(Ingredient)).one()
    logger.info("Seeded %d ingredients from CSV (%d total)", len(rows), total)
    return len(rows)
