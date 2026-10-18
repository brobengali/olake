from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / "server"

for p in (ROOT, SERVER_DIR):
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)
