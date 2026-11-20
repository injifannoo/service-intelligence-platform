from uuid import UUID

from django.db.models import QuerySet

from .models import Category, Service


def get_categories(*, search_query: str | None = None) -> QuerySet[Category]:
    """Returns categories in name order, optionally filtered by name."""
    queryset = Category.objects.all()
    if search_query:
        queryset = queryset.filter(name__icontains=search_query.strip())
    return queryset


def get_category_by_id(category_id: UUID | str) -> Category | None:
    return Category.objects.filter(pk=category_id).first()


def get_services(
    *,
    organization_id: UUID | str | None = None,
    category_id: UUID | str | None = None,
    status: str | None = None,
    search_query: str | None = None,
) -> QuerySet[Service]:
    """Retrieves services with the filters the catalogue needs.

    `select_related` keeps the organization and category on the same query so a
    list never issues an N+1 pair per row. The aggregate rating is supplied by
    the serializer, which returns null until the reviews slice exists.
    """
    queryset = Service.objects.select_related("organization", "category").all()

    if organization_id:
        queryset = queryset.filter(organization_id=organization_id)

    if category_id:
        queryset = queryset.filter(category_id=category_id)

    if status is not None:
        normalized = status.strip().lower()
        if normalized in {"true", "active", "1"}:
            queryset = queryset.filter(status=True)
        elif normalized in {"false", "inactive", "0"}:
            queryset = queryset.filter(status=False)

    if search_query:
        queryset = queryset.filter(name__icontains=search_query.strip())

    return queryset


def get_service_by_id(service_id: UUID | str) -> Service | None:
    """Fetches one service with its parent and category already loaded."""
    return (
        Service.objects.select_related("organization", "category")
        .filter(pk=service_id)
        .first()
    )
