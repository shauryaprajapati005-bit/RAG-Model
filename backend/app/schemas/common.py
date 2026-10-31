"""Common Pydantic types and helpers."""

from typing import Any
from pydantic import BaseModel


class OkResponse(BaseModel):
    ok: bool = True
    message: str = "Success"

