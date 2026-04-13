from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse


def error_response(
    *,
    code: str,
    message: str,
    correlation_id: Optional[str],
    details: Optional[Dict[str, Any]] = None,
    status_code: int,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
                "correlation_id": correlation_id,
            }
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return error_response(
            code="http_error",
            message=str(exc.detail),
            details={},
            correlation_id=getattr(request.state, "correlation_id", None),
            status_code=exc.status_code,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return error_response(
            code="validation_error",
            message="Request validation failed",
            details={"issues": exc.errors()},
            correlation_id=getattr(request.state, "correlation_id", None),
            status_code=422,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        return error_response(
            code="internal_server_error",
            message="An unexpected error occurred",
            details={"exception": exc.__class__.__name__},
            correlation_id=getattr(request.state, "correlation_id", None),
            status_code=500,
        )
