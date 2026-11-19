import os

SECRET_KEY = os.environ.get("SECRET_KEY", "teachnest-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./app.db")
# sqlite:///./app.db resolves relative to the process CWD; main.py normalises
# it to the backend/ directory so `uvicorn app.main:app` from backend/ works.

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
