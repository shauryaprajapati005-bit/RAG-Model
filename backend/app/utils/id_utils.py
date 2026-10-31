"""ID utilities."""

from bson import ObjectId


def new_id() -> str:
    """Generate a new string ObjectId."""
    return str(ObjectId())


def safe_object_id(id_str: str) -> ObjectId:
    """
    Convert a string to a MongoDB ObjectId.
    Raises ValueError on invalid format.
    """
    try:
        return ObjectId(id_str)
    except Exception:
        raise ValueError(f"Invalid ObjectId: {id_str!r}")


def obj_id_or_none(id_str: str | None) -> ObjectId | None:
    if not id_str:
        return None
    try:
        return ObjectId(id_str)
    except Exception:
        return None

