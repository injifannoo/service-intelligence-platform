"""Write-side operations for the organizations slice."""

from django.db import transaction

from features.users.models import User, UserRole

from .models import Industry, Organization, Service


@transaction.atomic
def create_organization(
    *,
    owner: User,
    name: str,
    industry: Industry | None,
    description: str | None = None,
    location: str | None = None,
    phone: str | None = None,
    website: str | None = None,
) -> Organization:
    organization = Organization.objects.create(
        name=name,
        industry=industry,
        description=description,
        location=location,
        phone=phone,
        website=website,
    )

    owner.organization = organization
    if owner.role == UserRole.CUSTOMER:
        owner.role = UserRole.ORGANIZATION_OWNER
    owner.save(update_fields=["organization", "role"])

    return organization


@transaction.atomic
def update_organization(
    organization: Organization,
    *,
    name: str,
    description: str | None = None,
    location: str | None = None,
    phone: str | None = None,
    website: str | None = None,
) -> Organization:
    """PUT is a full replace, so omitted optional fields are cleared."""
    organization.name = name
    organization.description = description
    organization.location = location
    organization.phone = phone
    organization.website = website
    organization.save(update_fields=["name", "description", "location", "phone", "website"])
    return organization


@transaction.atomic
def create_service(
    *,
    organization: Organization,
    name: str,
    description: str | None = None,
    price=None,
) -> Service:
    return Service.objects.create(
        organization=organization,
        name=name,
        description=description,
        price=price,
    )


@transaction.atomic
def update_service(service: Service, **changes) -> Service:
    """Partial update: only the keys the caller supplied are written."""
    for field, value in changes.items():
        setattr(service, field, value)
    if changes:
        service.save(update_fields=list(changes))
    return service


@transaction.atomic
def delete_service(service: Service) -> None:
    service.delete()
