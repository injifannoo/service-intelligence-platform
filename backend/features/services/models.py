from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from core.base_models import BaseModel


class Category(BaseModel):
    """Groups services into a shared catalogue vocabulary.

    docs/04_Database_Design.md:130 lists Category as an entity but does not
    define its columns, so the model stays intentionally small: a unique name
    and an optional description. Services reference a category by foreign key
    rather than by a free-text label so the value cannot drift per service.
    """

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "service_categories"
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Service(BaseModel):
    """A service offered by an organization (docs/04:318-333).

    `category` is the Sprint 4 Categories feature. It is nullable because the
    documented Service table has no category column and existing rows must stay
    valid; a service without one is still a complete, publishable service.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="services",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        related_name="services",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0"))],
    )
    status = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "services"
        ordering = ["name"]

    def __str__(self):
        return f"{self.organization.name}: {self.name}" if self.organization_id else self.name
