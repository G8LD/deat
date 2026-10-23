"""Tests for the ingredient CSV seeder (parse dedupe + idempotency)."""

from pathlib import Path

from sqlmodel import Session, func, select

from app.models.ingredients import Ingredient
from app.services.ingredients import parse_ingredients_csv, seed_ingredients


def _write_csv(tmp_path: Path, lines: list[str]) -> Path:
    path = tmp_path / "ingredients.csv"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def test_parse_dedupes_by_id_last_wins(tmp_path: Path) -> None:
    path = _write_csv(
        tmp_path,
        [
            "flour;100;g,cup",
            "sugar;200;g",
            "flour (bread);100;g,kg",  # duplicate id 100 -> last wins
        ],
    )
    rows = parse_ingredients_csv(path)
    by_id = {r["id"]: r for r in rows}
    assert len(rows) == 2
    assert by_id[100]["name"] == "flour (bread)"
    assert by_id[100]["possible_units"] == ["g", "kg"]
    assert by_id[200]["possible_units"] == ["g"]


def test_parse_skips_malformed_lines(tmp_path: Path) -> None:
    path = _write_csv(
        tmp_path,
        [
            "valid;300;g",
            "missing id",  # too few fields
            "notanumber;abc;g",  # non-numeric id
        ],
    )
    rows = parse_ingredients_csv(path)
    assert [r["id"] for r in rows] == [300]


def test_seed_is_idempotent(db: Session, tmp_path: Path) -> None:
    path = _write_csv(tmp_path, ["seedtest;909090;g,cup", "seedtest2;909091;ml"])

    n1 = seed_ingredients(db, path)
    count1 = db.exec(select(func.count()).select_from(Ingredient)).one()
    n2 = seed_ingredients(db, path)
    count2 = db.exec(select(func.count()).select_from(Ingredient)).one()

    assert n1 == 2
    assert n2 == 2
    assert count1 == count2  # no duplicate rows on re-seed

    ing = db.get(Ingredient, 909090)
    assert ing is not None
    assert ing.possible_units == ["g", "cup"]


def test_seed_missing_file_returns_zero(db: Session, tmp_path: Path) -> None:
    assert seed_ingredients(db, tmp_path / "nope.csv") == 0
