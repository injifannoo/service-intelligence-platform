from django.core.management.base import BaseCommand
from django.db import transaction

from features.users.models import CustomerTier, User, UserRole

DEMO_PASSWORD = "Password123!"

# Mirrors the accounts the frontend dev backend seeds, so switching
# NEXT_PUBLIC_USE_DEV_BACKEND to false keeps existing demo logins working.
DEMO_USERS = (
    ("Demo Customer", "customer@asip.dev", UserRole.CUSTOMER, CustomerTier.CUSTOMER, False, False),
    ("Demo Verified Customer", "verified@asip.dev", UserRole.CUSTOMER, CustomerTier.VERIFIED_CUSTOMER, False, False),
    ("Demo Premium Customer", "premium@asip.dev", UserRole.CUSTOMER, CustomerTier.PREMIUM_CUSTOMER, False, False),
    ("Demo Owner", "owner@asip.dev", UserRole.ORGANIZATION_OWNER, CustomerTier.CUSTOMER, False, False),
    ("Demo Moderator", "moderator@asip.dev", UserRole.MODERATOR, CustomerTier.CUSTOMER, True, False),
    ("Demo Admin", "admin@asip.dev", UserRole.ADMIN, CustomerTier.CUSTOMER, True, False),
    ("Demo Super Admin", "superadmin@asip.dev", UserRole.SUPER_ADMIN, CustomerTier.CUSTOMER, True, True),
)


class Command(BaseCommand):
    help = "Create or refresh the idempotent demo accounts used for local development."

    @transaction.atomic
    def handle(self, *args, **options):
        for name, email, role, customer_tier, is_staff, is_superuser in DEMO_USERS:
            user, created = User.objects.get_or_create(email=email)
            user.name = name
            user.role = role
            user.customer_tier = customer_tier
            user.is_active = True
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.set_password(DEMO_PASSWORD)
            user.save()

            verb = "Created" if created else "Updated"
            self.stdout.write(f"{verb} {email} ({role} / {customer_tier})")

        self.stdout.write(self.style.SUCCESS(f"Demo password: {DEMO_PASSWORD}"))
