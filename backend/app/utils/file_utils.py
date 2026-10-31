"""File-related utilities."""

import mimetypes
import re
from pathlib import Path


def is_pdf(filename: str, content_type: str = "") -> bool:
    """Return True if the file appears to be a PDF."""
    name_ok = filename.lower().endswith(".pdf")
    ct_ok = content_type in ("application/pdf", "application/octet-stream", "")
    return name_ok and ct_ok


def safe_filename(filename: str) -> str:
    """Return a safe, stripped filename (no path traversal)."""
    name = Path(filename).name
    name = re.sub(r"[^\w\-. ]", "_", name)
    return name or "upload.pdf"


def format_file_size(size_bytes: int) -> str:
    """Convert raw bytes to a human-readable string matching frontend format."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"

