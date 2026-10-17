from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger
from app.db.database import engine, Base, SessionLocal
from app.db.models import SystemSetting
from app.services.scheduler import start_scheduler, stop_scheduler
from app.api.routes_public import router as public_router
from app.api.routes_auth import router as auth_router
from app.api.routes_user import router as user_router
from app.api.routes_admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup check: create tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Initialize default thresholds if not present
    db = SessionLocal()
    try:
        if not db.query(SystemSetting).filter(SystemSetting.key == "warning_threshold").first():
            db.add(SystemSetting(key="warning_threshold", value=str(settings.DEFAULT_WARNING_THRESHOLD)))
        if not db.query(SystemSetting).filter(SystemSetting.key == "danger_threshold").first():
            db.add(SystemSetting(key="danger_threshold", value=str(settings.DEFAULT_DANGER_THRESHOLD)))
        if not db.query(SystemSetting).filter(SystemSetting.key == "source_status").first():
            db.add(SystemSetting(key="source_status", value="live"))
        db.commit()
    finally:
        db.close()
        
    # Start scheduler for periodic 30-min data pull
    start_scheduler()
    logger.info("AirSense backend initialized and ready.")
    
    yield
    
    # Shutdown
    stop_scheduler()
    logger.info("AirSense backend shutdown completed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Campus Air Quality Monitoring and Forecasting API for BBSUTSD Khairpur Mirs, Sindh, Pakistan.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers returning {"error": "..."}
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = "; ".join([f"{'.'.join(str(l) for l in e.get('loc', []))}: {e.get('msg')}" for e in errors])
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": f"Validation error: {msg}"}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "An internal server error occurred"}
    )

# Register API Routers
app.include_router(public_router, prefix=settings.API_PREFIX)
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(user_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)
