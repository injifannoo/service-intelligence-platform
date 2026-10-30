"""Read-side queries for the users slice (the repository layer)."""

from .models import User


def get_user_by_email(email: str) -> User | None:
    if not isinstance(email, str):
        return None
    return User.objects.filter(email__iexact=email.strip()).first()


def get_user_by_id(user_id) -> User | None:
    return User.objects.filter(pk=user_id).first()
