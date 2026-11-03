from uuid import UUID
from django.db import transaction

from features.users.models import User, UserRole

from .models import Industry, Organization, VerificationStatus


@transaction.atomic
def create_organization(
    *,
    owner: User,
    name: str,
    industry_id: UUID | str,
    description: str = "",
    location: str = "",
    phone: str = "",
    website: str = "",
) -> Organization:
    """Creates a new organization profile and assigns the creator as owner.

    Also updates the user role to ORGANIZATION_OWNER if currently CUSTOMER.
    """
    industry = Industry.objects.get(pk=industry_id)

    organization = Organization.objects.create(
        owner=owner,
        name=name.strip(),
        industry=industry,
        description=description.strip(),
        location=location.strip(),
        phone=phone.strip(),
        website=website.strip(),
        verification_status=VerificationStatus.UNVERIFIED,
    )

    if owner.role == UserRole.CUSTOMER:
        owner.role = UserRole.ORGANIZATION_OWNER
        owner.save(update_fields=["role"])

    return organization


@transaction.atomic
def update_organization(
    organization: Organization,
    *,
    name: str | None = None,
    industry_id: UUID | str | None = None,
    description: str | None = None,
    location: str | None = None,
    phone: str | None = None,
    website: str | None = None,
) -> Organization:
    """Updates an organization profile."""
    update_fields = []

    if name is not None:
        organization.name = name.strip()
        update_fields.append("name")

    if industry_id is not None:
        organization.industry = Industry.objects.get(pk=industry_id)
        update_fields.append("industry")

    if description is not None:
        organization.description = description.strip()
        update_fields.append("description")

    if location is not None:
        organization.location = location.strip()
        update_fields.append("location")

    if phone is not None:
        organization.phone = phone.strip()
        update_fields.append("phone")

    if website is not None:
        organization.website = website.strip()
        update_fields.append("website")

    if update_fields:
        organization.save(update_fields=update_fields)

    return organization


@transaction.atomic
def submit_verification_claim(
    organization: Organization,
) -> Organization:
    """Transitions an organization status to PENDING for platform admin review."""
    organization.verification_status = VerificationStatus.PENDING
    organization.save(update_fields=["verification_status"])
    return organization