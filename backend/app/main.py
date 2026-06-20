from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes.tasks import router as task_router
from app.core.config import get_settings
from app.core.security import configure_cors
from app.utils.logger import configure_logging, logging_middleware

settings = get_settings()
configure_logging()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

configure_cors(app, settings)
app.middleware("http")(logging_middleware)
app.include_router(task_router, prefix=settings.api_prefix, tags=["tasks"])


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": "Database operation failed"})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        raise exc
    return JSONResponse(status_code=500, content={"detail": "Unexpected server error"})


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "healthy"}


app_file = Path(__file__).resolve()
frontend_dir = next(
    (
        candidate
        for candidate in (
            app_file.parents[1] / "frontend",
            app_file.parents[2] / "frontend",
            Path("/frontend"),
        )
        if candidate.exists()
    ),
    app_file.parents[2] / "frontend",
)
assets_dir = frontend_dir / "assets"
css_dir = frontend_dir / "css"
js_dir = frontend_dir / "js"

if frontend_dir.exists():
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
    app.mount("/js", StaticFiles(directory=js_dir), name="js")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(frontend_dir / "index.html")


@app.get("/dashboard", include_in_schema=False)
def dashboard() -> FileResponse:
    return FileResponse(frontend_dir / "dashboard.html")


@app.get("/tasks", include_in_schema=False)
def tasks() -> FileResponse:
    return FileResponse(frontend_dir / "tasks.html")
