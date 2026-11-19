import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Resolve a relative SQLite path against the backend/ directory (where app.db
# lives), not whatever directory uvicorn was launched from.
_raw_url = os.environ.get("DATABASE_URL", "sqlite:///./app.db")
if _raw_url.startswith("sqlite:///") and not _raw_url.startswith("sqlite:////"):
    _path = _raw_url[len("sqlite:///"):]
    if not os.path.isabs(_path):
        _backend_dir = Path(__file__).resolve().parent.parent
        _path = str(_backend_dir / _path)
    DATABASE_URL = f"sqlite:///{_path}"
else:
    DATABASE_URL = _raw_url

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
