from django.core.management.base import BaseCommand
from django.db import transaction

from features.users.models import User, UserRole

DEMO_PASSWORD = "Password123!"

# Mirrors the accounts the frontend dev backend seeds, so switching
# NEXT_PUBLIC_USE_DEV_BACKEND to false keeps existing demo logins working.
DEMO_USERS = (
    ("Demo Customer", "customer@asip.dev", UserRole.CUSTOMER, False, False),
    ("Demo Owner", "owner@asip.dev", UserRole.ORGANIZATION_OWNER, False, False),
    ("Demo Admin", "admin@asip.dev", UserRole.ADMIN, True, False),
    ("Demo Super Admin", "superadmin@asip.dev", UserRole.SUPER_ADMIN, True, True),
)


class Command(BaseCommand):
    help = "Create or refresh the idempotent demo accounts used for local development."

    @transaction.atomic
    def handle(self, *args, **options):
        for name, email, role, is_staff, is_superuser in DEMO_USERS:
            user, created = User.objects.get_or_create(email=email)
            user.name = name
            user.role = role
            user.is_active = True
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.set_password(DEMO_PASSWORD)
            user.save()

            verb = "Created" if created else "Updated"
            self.stdout.write(f"{verb} {email} ({role})")

        self.stdout.write(self.style.SUCCESS(f"Demo password: {DEMO_PASSWORD}"))
