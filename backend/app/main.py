import sys
import traceback

print(">>> [SENTRA-DIAGNOSTICS] Starting Sentra AI Backend Pre-flight Check...")

try:
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

    print(">>> [SENTRA-DIAGNOSTICS] Core modules imported successfully.")
    sys.stdout.flush()
except Exception as e:
    print("!!! [SENTRA-DIAGNOSTICS] CRITICAL IMPORT ERROR DURING STARTUP !!!")
    traceback.print_exc()
    sys.stdout.flush()
    sys.exit(1)

try:
    configure_logging()
    print(">>> [SENTRA-DIAGNOSTICS] Logging configured.")
    sys.stdout.flush()
except Exception as e:
    print("!!! [SENTRA-DIAGNOSTICS] LOGGING CONFIGURATION FAILED !!!")
    traceback.print_exc()
    sys.stdout.flush()
    sys.exit(1)

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

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Sentra AI Backend is running successfully!"}


@app.on_event("startup")
def startup() -> None:
    print(">>> [SENTRA-DIAGNOSTICS] Startup event triggered.")
    try:
        if not settings.bootstrap_db_on_startup:
            print(">>> [SENTRA-DIAGNOSTICS] DB Bootstrap skipped (Config).")
            return
            
        print(">>> [SENTRA-DIAGNOSTICS] Initializing DB schema...")
        Base.metadata.create_all(bind=engine)
        
        print(">>> [SENTRA-DIAGNOSTICS] Seeding baseline data...")
        with SessionLocal() as db:
            seed_phase_one_data(db)
        print(">>> [SENTRA-DIAGNOSTICS] Startup complete. System ready.")
        
    except Exception as e:
        print("!!! [SENTRA-DIAGNOSTICS] STARTUP EVENT FAILED !!!")
        traceback.print_exc()
        # On Render, we want the app to exit so the logs are flushed and clear
        sys.exit(1)
