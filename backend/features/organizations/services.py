from __future__ import annotations

import logging
from uuid import UUID

from django.core.cache import cache
from django.db import transaction

from features.users.models import User, UserRole

from .models import Industry, Organization, VerificationStatus
from .tasks import sync_organization_embedding_task

logger = logging.getLogger(__name__)


def _enqueue_embedding_sync(organization_id: UUID | str) -> None:
    """Dispatches async embedding sync after DB commit without failing HTTP writes if broker is down."""
    org_id_str = str(organization_id)

    def _dispatch() -> None:
        try:
            sync_organization_embedding_task.delay(org_id_str)
        except Exception as exc:  # noqa: BLE001 - never break primary DB write if broker is offline
            logger.warning("Failed to enqueue embedding sync for org %s: %s", org_id_str, exc)

    transaction.on_commit(_dispatch)


def _invalidate_organization_cache(organization: Organization) -> None:
    cache.delete(f"org:detail:{organization.id}")
    if organization.slug:
        cache.delete(f"org:slug:{organization.slug}")


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
    tagline: str = "",
    email: str = "",
    business_hours: str = "",
    founded: int | None = None,
    size: str = "10-50",
    price_tier: int = 2,
    response_hours: int = 24,
    certifications: list[str] | None = None,
    industries_served: list[str] | None = None,
    logo_url: str = "",
) -> Organization:
    """Creates a new organization profile, assigns the creator as owner, and schedules embedding sync."""
    industry = Industry.objects.get(pk=industry_id)

    organization = Organization.objects.create(
        owner=owner,
        name=name.strip(),
        tagline=tagline.strip(),
        industry=industry,
        description=description.strip(),
        location=location.strip(),
        phone=phone.strip(),
        email=email.strip(),
        website=website.strip(),
        business_hours=business_hours.strip(),
        founded=founded,
        size=size.strip() if size else "10-50",
        price_tier=price_tier,
        response_hours=response_hours,
        certifications=certifications or [],
        industries_served=industries_served or [],
        logo_url=logo_url.strip(),
        verification_status=VerificationStatus.UNVERIFIED,
    )

    if owner.role == UserRole.CUSTOMER:
        owner.role = UserRole.ORGANIZATION_OWNER
        owner.save(update_fields=["role"])

    _enqueue_embedding_sync(organization.id)
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
    tagline: str | None = None,
    email: str | None = None,
    business_hours: str | None = None,
    founded: int | None = None,
    size: str | None = None,
    price_tier: int | None = None,
    response_hours: int | None = None,
    certifications: list[str] | None = None,
    industries_served: list[str] | None = None,
    logo_url: str | None = None,
) -> Organization:
    """Updates an organization profile, invalidates cache, and schedules embedding re-sync."""
    update_fields: list[str] = []
    semantic_dirty = False

    if name is not None:
        organization.name = name.strip()
        update_fields.append("name")
        semantic_dirty = True

    if tagline is not None:
        organization.tagline = tagline.strip()
        update_fields.append("tagline")
        semantic_dirty = True

    if industry_id is not None:
        organization.industry = Industry.objects.get(pk=industry_id)
        update_fields.append("industry")
        semantic_dirty = True

    if description is not None:
        organization.description = description.strip()
        update_fields.append("description")
        semantic_dirty = True

    if location is not None:
        organization.location = location.strip()
        update_fields.append("location")
        semantic_dirty = True

    if phone is not None:
        organization.phone = phone.strip()
        update_fields.append("phone")

    if email is not None:
        organization.email = email.strip()
        update_fields.append("email")

    if website is not None:
        organization.website = website.strip()
        update_fields.append("website")

    if business_hours is not None:
        organization.business_hours = business_hours.strip()
        update_fields.append("business_hours")

    if founded is not None:
        organization.founded = founded
        update_fields.append("founded")

    if size is not None:
        organization.size = size.strip()
        update_fields.append("size")

    if price_tier is not None:
        organization.price_tier = price_tier
        update_fields.append("price_tier")

    if response_hours is not None:
        organization.response_hours = response_hours
        update_fields.append("response_hours")

    if certifications is not None:
        organization.certifications = certifications
        update_fields.append("certifications")

    if industries_served is not None:
        organization.industries_served = industries_served
        update_fields.append("industries_served")
        semantic_dirty = True

    if logo_url is not None:
        organization.logo_url = logo_url.strip()
        update_fields.append("logo_url")

    if update_fields:
        organization.save(update_fields=update_fields)
        _invalidate_organization_cache(organization)
        if semantic_dirty:
            _enqueue_embedding_sync(organization.id)

    return organization


@transaction.atomic
def submit_verification_claim(
    organization: Organization,
) -> Organization:
    """Transitions an organization status to PENDING for platform admin review."""
    organization.verification_status = VerificationStatus.PENDING
    organization.save(update_fields=["verification_status"])
    _invalidate_organization_cache(organization)
    return organization