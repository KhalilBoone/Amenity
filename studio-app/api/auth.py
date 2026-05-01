"""FastAPI dependency that turns the ``Authorization: Bearer <jwt>`` header
into a ``CurrentUser`` (user_id + raw JWT for forwarding to Supabase).

Verification strategy:
  * Decode-only by default. We trust Supabase's RLS as the actual security
    boundary — this dependency just extracts ``sub``. If the JWT is forged,
    the per-request Supabase client built with it will still fail any RLS
    check that depends on ``auth.uid()`` matching real data.
  * If ``SUPABASE_JWT_SECRET`` is set, we additionally verify the HMAC
    signature with PyJWT. Recommended for production.

Usage:
    @app.get("/cart")
    def get_cart(user: CurrentUser = Depends(require_user)) -> dict:
        client = user_client(user.jwt)
        ...
"""
from __future__ import annotations

import os
from dataclasses import dataclass

try:
    from fastapi import Depends, Header, HTTPException, status
except Exception:  # pragma: no cover
    Depends = lambda x: x  # type: ignore
    Header = lambda *a, **kw: None  # type: ignore

    class HTTPException(Exception):  # type: ignore
        def __init__(self, status_code: int = 401, detail: str = "") -> None:
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class _S:
        HTTP_401_UNAUTHORIZED = 401
        HTTP_403_FORBIDDEN = 403

    status = _S()  # type: ignore


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    jwt: str
    email: str | None = None


def _decode_jwt(token: str) -> dict:
    """Return the JWT payload. Verify the signature when possible."""
    try:
        import jwt as pyjwt  # PyJWT
    except ImportError as e:  # pragma: no cover
        raise HTTPException(
            status_code=500,
            detail="PyJWT not installed. `pip install pyjwt`.",
        ) from e

    secret = os.getenv("SUPABASE_JWT_SECRET")
    if secret:
        try:
            # Supabase signs with HS256; audience is "authenticated".
            return pyjwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"invalid token: {e}",
            ) from e

    # Fallback: decode without verifying. RLS still defends real data.
    try:
        return pyjwt.decode(token, options={"verify_signature": False})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"unparseable token: {e}",
        ) from e


def require_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    """Authentication dependency — 401 if header is missing or malformed."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
        )
    token = authorization.split(" ", 1)[1].strip()
    payload = _decode_jwt(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token missing sub",
        )
    return CurrentUser(user_id=user_id, jwt=token, email=payload.get("email"))


def optional_user(
    authorization: str | None = Header(default=None),
) -> CurrentUser | None:
    """Same shape as ``require_user`` but returns None for guests instead
    of 401. Use for routes that work for both anonymous and signed-in
    visitors (e.g. product browsing)."""
    if not authorization:
        return None
    try:
        return require_user(authorization)
    except HTTPException:
        return None
