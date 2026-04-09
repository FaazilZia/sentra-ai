from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.bootstrap import seed_phase_one_data
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import CorrelationIdMiddleware
from app.db.base import Base
from app.db import models  # noqa: F401
from app.db.session import SessionLocal, engine


configure_logging()

app = FastAPI(title=settings.app_name, debug=settings.debug)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CorrelationIdMiddleware)
app.include_router(api_router, prefix=settings.api_prefix)
register_exception_handlers(app)


@app.on_event("startup")
def startup() -> None:
    if not settings.bootstrap_db_on_startup:
        return
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_phase_one_data(db)
