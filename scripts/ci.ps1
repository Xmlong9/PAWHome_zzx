$ErrorActionPreference = "Stop"

$env:PYTHONDONTWRITEBYTECODE = "1"

Set-Location (Resolve-Path "$PSScriptRoot\..")

python -m pip install -r backend/requirements.txt
python -m pip install -r backend/requirements-dev.txt

python -m pytest -q --maxfail=1 --disable-warnings --cov=backend/app --cov-report=term-missing --cov-fail-under=90
