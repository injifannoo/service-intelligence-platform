import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models


class UserRole(models.TextChoices):
    """docs/04_Database_Design.md:260-270."""

    CUSTOMER = "CUSTOMER", "Customer"
    ORGANIZATION_OWNER = "ORGANIZATION_OWNER", "Organization Owner"
    ADMIN = "ADMIN", "Admin"
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        if not name:
            raise ValueError("Users must have a name.")

        user = self.model(
            email=self.normalize_email(email).strip().lower(),
            name=name.strip(),
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.SUPER_ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, name, password, **extra_fields)

    def get_by_natural_key(self, email):
        """Email login is case-insensitive."""
        return self.get(email__iexact=email)


class User(AbstractBaseUser, PermissionsMixin):
    """docs/04_Database_Design.md:242-258, with the API's `status` mapping to `is_active`."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=32,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER,
    )
    # `status` on the wire; Django and simplejwt both look for `is_active`.
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    # docs/04 gives Organization no owner column, so the backend owns the
    # user -> organization association and uses it as the tenant boundary.
    organization = models.ForeignKey(
        "organizations.Organization",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owners",
        db_column="organization_id",
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table = "users"
        ordering = ["name", "email"]

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    @property
    def status(self):
        return self.is_active
