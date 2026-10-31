"""Sentra SDK Exceptions."""

from typing import Any, Optional


class SentraError(Exception):
    """Exception raised by the Sentra SDK for configuration or runtime governance errors."""

    def __init__(
        self,
        message: str,
        status: Optional[int] = None,
        data: Any = None,
        fix: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status = status
        self.data = data
        self.fix = fix

    def __str__(self) -> str:
        return self.message

    def __repr__(self) -> str:
        return f"SentraError({self.message!r}, status={self.status!r}, fix={self.fix!r})"
