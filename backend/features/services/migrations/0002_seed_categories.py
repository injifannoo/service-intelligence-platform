import uuid

from django.db import migrations

DEFAULT_CATEGORIES = (
    ("Consulting", "Advisory, strategy, and specialist consulting engagements."),
    ("Cloud & Infrastructure", "Hosting, migration, DevOps, and managed infrastructure."),
    ("Custom Development", "Bespoke software, web, mobile, and integration work."),
    ("Data & AI", "Analytics, machine learning, and data platform services."),
    ("Design & Brand", "Product design, brand identity, and creative production."),
    ("Marketing & Growth", "Campaigns, SEO, content, and customer acquisition."),
    ("Support & Maintenance", "Ongoing support, monitoring, and maintenance plans."),
    ("Training", "Workshops, technical training, and capability building."),
)


def seed_categories(apps, schema_editor):
    Category = apps.get_model("services", "Category")
    for name, description in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            name=name,
            defaults={"id": uuid.uuid4(), "description": description},
        )


def remove_seeded_categories(apps, schema_editor):
    Category = apps.get_model("services", "Category")
    names = [name for name, _ in DEFAULT_CATEGORIES]
    # PROTECT the catalogue: a category that a service still references is left
    # in place rather than cascading away the service.
    for category in Category.objects.filter(name__in=names):
        if not category.services.exists():
            category.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_categories, remove_seeded_categories),
    ]
