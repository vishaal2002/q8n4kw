import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from gale.main import app  # noqa: E402

__all__ = ["app"]
