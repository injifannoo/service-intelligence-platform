from django.conf import settings
from django.db import models
from core.base_models import BaseModel


class SearchLog(BaseModel):
    """Tracks user search queries and analytics for the platform."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="search_logs",
        null=True,
        blank=True,
    )
    query = models.CharField(max_length=500, db_index=True)
    filters_applied = models.JSONField(default=dict, blank=True)
    results_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "search_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Search: {self.query} ({self.results_count} results)"