from django.contrib import admin

from .models import Review, ReviewReport


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("organization", "user", "rating", "verified", "created_at")
    list_filter = ("verified", "rating")
    search_fields = ("organization__name", "user__email", "comment")
    list_select_related = ("organization", "user")
    readonly_fields = ("created_at",)


@admin.register(ReviewReport)
class ReviewReportAdmin(admin.ModelAdmin):
    list_display = ("review", "reporter", "reason", "reported_at")
    search_fields = ("reason", "note")
    list_select_related = ("review", "reporter")
    readonly_fields = ("reported_at",)
