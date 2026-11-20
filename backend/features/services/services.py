from decimal import Decimal
from uuid import UUID

from django.db import transaction

from features.organizations.models import Organization

from .models import Category, Service


@transaction.atomic
def create_service(
    *,
    organization: Organization,
    name: str,
    description: str = "",
    price: Decimal | None = None,
    category_id: UUID | str | None = None,
    status: bool = True,
) -> Service:
    """Publishes a service under an organization."""
    category = Category.objects.get(pk=category_id) if category_id else None

    return Service.objects.create(
        organization=organization,
        category=category,
        name=name.strip(),
        description=description.strip(),
        price=price,
        status=status,
    )


@transaction.atomic
def update_service(
    service: Service,
    *,
    name: str | None = None,
    description: str | None = None,
    price: Decimal | None = None,
    category_id: UUID | str | None = None,
    clear_category: bool = False,
    status: bool | None = None,
) -> Service:
    """Updates the fields the caller supplied.

    `clear_category` exists because `category_id=None` cannot distinguish "the
    key was omitted" from "remove the category" once the serializer has
    validated the payload.
    """
    update_fields = []

    if name is not None:
        service.name = name.strip()
        update_fields.append("name")

    if description is not None:
        service.description = description.strip()
        update_fields.append("description")

    if price is not None:
        service.price = price
        update_fields.append("price")

    if clear_category:
        service.category = None
        update_fields.append("category")
    elif category_id is not None:
        service.category = Category.objects.get(pk=category_id)
        update_fields.append("category")

    if status is not None:
        service.status = status
        update_fields.append("status")

    if update_fields:
        service.save(update_fields=update_fields)

    return service


@transaction.atomic
def delete_service(service: Service) -> None:
    service.delete()
