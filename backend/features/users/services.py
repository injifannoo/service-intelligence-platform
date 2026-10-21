"""Write-side operations for the users slice."""

from django.db import transaction
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from core.exceptions import AccountInactive, InvalidCredentials, InvalidTokenError

from .models import User
from .selectors import get_user_by_email, get_user_by_id


class UserRefreshToken(RefreshToken):
    """Adds the role claim the frontend dev tokens also carry."""

    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        token["role"] = user.role
        return token


def issue_tokens(user: User) -> dict[str, str]:
    refresh = UserRefreshToken.for_user(user)
    return {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
    }


@transaction.atomic
def register_user(*, name: str, email: str, password: str) -> User:
    return User.objects.create_user(email=email, name=name, password=password)


def authenticate_user(*, email: str, password: str) -> User:
    """Mirrors the BFF: credentials are checked before account status."""
    user = get_user_by_email(email)
    if user is None or not user.check_password(password):
        raise InvalidCredentials()
    if not user.is_active:
        raise AccountInactive()
    return user


def refresh_session(*, refresh_token: str) -> User:
    """Validates a refresh token, revokes it, and returns its active owner."""
    try:
        token = UserRefreshToken(refresh_token)
    except TokenError as exc:
        raise InvalidTokenError() from exc

    user = get_user_by_id(token.get("user_id"))
    if user is None:
        raise InvalidTokenError()
    if not user.is_active:
        raise AccountInactive()

    try:
        token.blacklist()
    except TokenError:
        # Another request rotated the same token first; the caller still gets a
        # fresh pair, which is harmless.
        pass

    return user


def blacklist_refresh_token(refresh_token: str | None) -> None:
    """Logout is idempotent: a missing or already-dead token is not an error."""
    if not refresh_token:
        return
    try:
        UserRefreshToken(refresh_token).blacklist()
    except TokenError:
        pass


@transaction.atomic
def update_profile(user: User, *, name: str, email: str) -> User:
    user.name = name
    user.email = email
    user.save(update_fields=["name", "email"])
    return user
