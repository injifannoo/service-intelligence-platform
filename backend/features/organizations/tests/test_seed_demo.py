import uuid
from io import StringIO

import pytest
from django.core.management import call_command

from features.organizations.models import Industry, Organization, Service, VerificationStatus
from features.reviews.models import Review
from features.users.models import User, UserRole

pytestmark = pytest.mark.django_db

EXPECTED_ORGANIZATIONS = [
    (11, "Addis Software Works", VerificationStatus.VERIFIED),
    (12, "Blue Nile Digital Agency", VerificationStatus.VERIFIED),
    (13, "Habesha Cloud Services", VerificationStatus.PENDING),
    (14, "Sidama Data Labs", VerificationStatus.VERIFIED),
    (15, "Rift Valley Security", VerificationStatus.REJECTED),
    (16, "Amhara IT Consultancy", VerificationStatus.PENDING),
]


def seed():
    call_command("seed_demo", verbosity=0, stdout=StringIO())


def test_seed_demo_mirrors_the_frontend_store():
    seed()

    assert Industry.objects.count() == 5
    assert list(Industry.objects.values_list("name", flat=True)) == [
        "Software",
        "AI",
        "IT Services",
        "Digital Agency",
        "Cybersecurity",
    ]

    organizations = list(Organization.objects.all())
    assert [(str(entry.id), entry.name) for entry in organizations] == [
        (f"00000000-0000-4000-8000-{number:012d}", name)
        for number, name, _ in EXPECTED_ORGANIZATIONS
    ]
    assert [organization.verification_status for organization in organizations] == [
        state for _, _, state in EXPECTED_ORGANIZATIONS
    ]

    assert Service.objects.count() == 8
    assert list(
        Service.objects.filter(organization_id="00000000-0000-4000-8000-000000000011").values_list(
            "name", flat=True
        )
    ) == [
        "Custom Web Application",
        "Mobile App Development",
        "Legacy System Modernisation",
    ]

    owner = User.objects.get(email="owner@asip.dev")
    assert owner.role == UserRole.ORGANIZATION_OWNER
    assert owner.organization_id == uuid.UUID("00000000-0000-4000-8000-000000000011")

    assert Review.objects.count() == 7
    newest = Review.objects.order_by("-created_at").first()
    assert newest.comment == (
        "Delivered a complex billing system on time and communicated well throughout."
    )
    assert newest.user.name == "Demo Customer"
    assert newest.rating == 5
    assert newest.quality == 5


def test_seed_demo_is_idempotent_and_keeps_demo_accounts():
    seed()
    seed()

    assert Industry.objects.count() == 5
    assert Organization.objects.count() == 6
    assert Service.objects.count() == 8
    assert Review.objects.count() == 7
    assert User.objects.filter(email__endswith="@asip.dev").count() == 4
