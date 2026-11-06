"""Compatibilidad de importación y punto ASGI de la aplicación."""
from .adapters.inbound.rest import app

__all__ = ["app"]
