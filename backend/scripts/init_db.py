import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app import models as _models


def main() -> None:
    app = create_app()
    with app.app_context():
        db.create_all()


if __name__ == "__main__":
    main()
