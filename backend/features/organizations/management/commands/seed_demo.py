import uuid
from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from features.reviews.models import Review
from features.users.models import User

from ...models import Industry, Organization, Service, VerificationStatus


def _id(number: int) -> uuid.UUID:
    return uuid.UUID(f"00000000-0000-4000-8000-{number:012d}")


# Mirrors the frontend dev store (frontend/src/lib/dev-backend/store.ts) so
# switching NEXT_PUBLIC_USE_DEV_BACKEND to false keeps the demo data intact.
INDUSTRIES = (
    (21, "Software", "Software companies and product engineering providers."),
    (22, "AI", "Artificial intelligence and machine learning providers."),
    (23, "IT Services", "IT infrastructure, support, and systems integration."),
    (24, "Digital Agency", "Digital marketing, brand, and content agencies."),
    (25, "Cybersecurity", "Security audits, penetration testing, and compliance."),
)

ORGANIZATIONS = (
    (
        11,
        "Addis Software Works",
        "Custom web and mobile product engineering for Ethiopian enterprises, "
        "with a distributed delivery team.",
        21,
        "Addis Ababa",
        "+251 11 555 0101",
        "https://example.com/addis-software",
        VerificationStatus.VERIFIED,
    ),
    (
        12,
        "Blue Nile Digital Agency",
        "Brand identity, performance marketing, and content production.",
        24,
        "Addis Ababa",
        "+251 11 555 0102",
        "https://example.com/bluenile",
        VerificationStatus.VERIFIED,
    ),
    (
        13,
        "Habesha Cloud Services",
        "Managed cloud hosting, backups, and 24/7 infrastructure monitoring.",
        23,
        "Bahir Dar",
        "+251 22 555 0103",
        "https://example.com/habesha-cloud",
        VerificationStatus.PENDING,
    ),
    (
        14,
        "Sidama Data Labs",
        "Analytics pipelines, data warehousing, and machine-learning model deployment.",
        22,
        "Hawassa",
        "+251 46 555 0104",
        "https://example.com/sidama-data",
        VerificationStatus.VERIFIED,
    ),
    (
        15,
        "Rift Valley Security",
        "Penetration testing, security audits, and compliance readiness.",
        25,
        "Adama",
        "+251 22 555 0105",
        "https://example.com/rift-security",
        VerificationStatus.REJECTED,
    ),
    (
        16,
        "Amhara IT Consultancy",
        "IT strategy, systems integration, and staff technical training.",
        23,
        "Bahir Dar",
        "+251 22 555 0106",
        "https://example.com/amhara-it",
        VerificationStatus.PENDING,
    ),
)


# (review number, author email, organization id, rating, comment)
REVIEWS = (
    (
        1,
        "customer@asip.dev",
        11,
        5,
        "Delivered a complex billing system on time and communicated well throughout.",
    ),
    (
        2,
        "owner@asip.dev",
        11,
        4,
        "Strong engineering team. A few late handoffs during discovery.",
    ),
    (
        3,
        "customer@asip.dev",
        12,
        4,
        "Good creative output, though the reporting was slow to arrive.",
    ),
    (
        4,
        "customer@asip.dev",
        13,
        3,
        "Hosting is reliable but support response times are slow at peak.",
    ),
    (
        5,
        "customer@asip.dev",
        14,
        5,
        "Rebuilt our reporting stack and the dashboards are dramatically faster.",
    ),
    (
        6,
        "customer@asip.dev",
        15,
        2,
        "Report was generic and missed two findings we already knew about.",
    ),
    (
        7,
        "owner@asip.dev",
        12,
        5,
        "Excellent brand work, delivered exactly to the agreed brief.",
    ),
)


SERVICES = (
    (
        31,
        11,
        "Custom Web Application",
        "End-to-end web application build with a 12-week delivery cycle.",
        85000,
    ),
    (
        32,
        11,
        "Mobile App Development",
        "Cross-platform mobile applications for iOS and Android.",
        60000,
    ),
    (
        33,
        11,
        "Legacy System Modernisation",
        "Incremental migration of legacy backends to current frameworks.",
        120000,
    ),
    (
        34,
        12,
        "Brand Identity Package",
        "Logo, palette, typography, and brand guidelines.",
        25000,
    ),
    (
        35,
        12,
        "Performance Marketing",
        "Monthly paid acquisition management and reporting.",
        18000,
    ),
    (
        36,
        13,
        "Managed Hosting",
        "Managed VPS hosting with 99.9% uptime commitment.",
        9000,
    ),
    (
        37,
        14,
        "Data Warehouse Build",
        "Warehouse modelling, ETL pipelines, and dashboards.",
        140000,
    ),
    (
        38,
        15,
        "Penetration Test",
        "Authenticated penetration test with a remediation report.",
        45000,
    ),
)


class Command(BaseCommand):
    help = "Seed the demo users, industries, organizations, and services."

    @transaction.atomic
    def handle(self, *args, **options):
        call_command("seed_users", verbosity=0, stdout=self.stdout)

        industries = {}
        for number, name, description in INDUSTRIES:
            industry, _ = Industry.objects.update_or_create(
                id=_id(number),
                defaults={"name": name, "description": description},
            )
            industries[number] = industry

        organizations = {}
        # The API lists newest first; create the seed in reverse so it appears in
        # the same order as the frontend store (11, 12, ... 16).
        for entry in reversed(ORGANIZATIONS):
            number, name, description, industry_id, location, phone, website, state = entry
            organization, _ = Organization.objects.update_or_create(
                id=_id(number),
                defaults={
                    "name": name,
                    "description": description,
                    "industry": industries[industry_id],
                    "location": location,
                    "phone": phone,
                    "website": website,
                    "verification_status": state,
                },
            )
            organizations[number] = organization

        for number, organization_id, name, description, price in SERVICES:
            Service.objects.update_or_create(
                id=_id(number),
                defaults={
                    "organization": organizations[organization_id],
                    "name": name,
                    "description": description,
                    "price": price,
                    "status": True,
                },
            )

        # Reviews are keyed by their author and organization; the demo store
        # spaces them one day apart so the newest sits first in the listing.
        now = timezone.now().replace(microsecond=0)
        for number, email, organization_id, rating, comment in REVIEWS:
            author = User.objects.filter(email=email).first()
            if author is None:
                continue
            review, _ = Review.objects.update_or_create(
                id=_id(40 + number),
                defaults={
                    "organization": organizations[organization_id],
                    "user": author,
                    "rating": rating,
                    "quality": rating,
                    "price": rating,
                    "customer_service": rating,
                    "speed": rating,
                    "overall_experience": rating,
                    "comment": comment,
                    "verified": True,
                },
            )
            Review.objects.filter(pk=review.pk).update(created_at=now - timedelta(days=number))

        owner = User.objects.filter(email="owner@asip.dev").first()
        if owner is not None and owner.organization_id is None:
            owner.organization = organizations[11]
            owner.save(update_fields=["organization"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(INDUSTRIES)} industries, {len(ORGANIZATIONS)} organizations, "
                f"{len(SERVICES)} services, and {len(REVIEWS)} reviews."
            )
        )
