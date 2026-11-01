"""Shared abstract base models used across every feature slice.

All domain models should inherit from these instead of `models.Model`
directly so that UUID primary keys and audit timestamps are guaranteed
across the entire schema without repetition.
"""

import uuid

from django.db import models


class UUIDModel(models.Model):
    """Abstract base that replaces the default auto-increment PK with a UUID.

    Using UUIDs as primary keys prevents enumeration attacks and keeps IDs
    stable when records are exported or migrated between environments.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    """Abstract base that automatically tracks creation and last-update times."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    """Convenience base combining UUID PK + timestamps.

    Most domain models should inherit from this single class.
    """

    class Meta:
        abstract = True
