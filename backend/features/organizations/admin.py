from django.contrib import admin

from .models import Industry, Organization, Service


@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "location", "verification_status", "created_at")
    list_filter = ("verification_status", "industry")
    search_fields = ("name", "description", "location")
    list_select_related = ("industry",)
    readonly_fields = ("created_at",)


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "price", "status")
    list_filter = ("status",)
    search_fields = ("name", "description", "organization__name")
    list_select_related = ("organization",)
