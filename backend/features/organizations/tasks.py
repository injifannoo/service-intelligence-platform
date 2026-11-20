"""Celery tasks for asynchronous organization vector embedding synchronization."""

from __future__ import annotations

import logging
from typing import Any

from celery import shared_task

from core.ai_client import AIEngineError, ServiceIntelAIClient
from .models import Organization

logger = logging.getLogger(__name__)


def build_organization_embedding_text(organization: Organization) -> str:
    """Constructs a rich semantic representation of an organization and its services."""
    services = list(
        organization.services.filter(status=True).values_list("name", "description")
    )
    service_snippets = [
        f"{name} ({desc.strip()})" if desc and desc.strip() else name
        for name, desc in services
    ]
    parts = [
        f"Organization: {organization.name}",
        f"Industry: {organization.industry.name}" if organization.industry_id else "",
        f"Tagline: {organization.tagline}" if organization.tagline else "",
        f"Description: {organization.description}" if organization.description else "",
        f"Location: {organization.location}" if organization.location else "",
        f"Services: {', '.join(service_snippets)}" if service_snippets else "",
        (
            f"Industries Served: {', '.join(organization.industries_served)}"
            if organization.industries_served
            else ""
        ),
    ]
    return " | ".join(part for part in parts if part)


@shared_task(
    bind=True,
    autoretry_for=(AIEngineError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="organizations.sync_organization_embedding",
)
def sync_organization_embedding_task(self, organization_id: str) -> dict[str, Any]:
    """Generates and persists a 768-dim pgvector embedding for an organization."""
    organization = (
        Organization.objects.select_related("industry")
        .prefetch_related("services")
        .filter(pk=organization_id)
        .first()
    )
    if not organization:
        logger.warning("Organization %s not found for embedding sync.", organization_id)
        return {"status": "skipped", "reason": "not_found", "organization_id": organization_id}

    document_text = build_organization_embedding_text(organization)
    if not document_text:
        return {"status": "skipped", "reason": "empty_document", "organization_id": organization_id}

    client = ServiceIntelAIClient()
    vector = client.generate_embedding(text=document_text, task_type="RETRIEVAL_DOCUMENT")
    if not vector:
        return {"status": "skipped", "reason": "empty_vector", "organization_id": organization_id}

    Organization.objects.filter(pk=organization.pk).update(embedding=vector)
    logger.info(
        "Synced %d-dim embedding for organization %s (%s)",
        len(vector),
        organization.slug,
        organization.id,
    )
    return {
        "status": "completed",
        "organization_id": str(organization.id),
        "dimension": len(vector),
    }