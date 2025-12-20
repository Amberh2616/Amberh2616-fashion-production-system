"""
Core Models - v2.2.1
Organization, User, Authentication
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class Organization(models.Model):
    """
    Multi-tenant support (optional for MVP single user)
    Represents a company/organization using the system
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)

    # Settings and limits
    settings = models.JSONField(default=dict, blank=True)
    ai_budget_monthly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=200.00,
        help_text="Monthly AI API budget limit in USD"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizations'
        verbose_name = 'Organization'
        verbose_name_plural = 'Organizations'

    def __str__(self):
        return self.name


class User(AbstractUser):
    """
    Extended user model with organization and role
    """
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('merchandiser', 'Merchandiser'),
        ('factory', 'Factory User'),
        ('viewer', 'Viewer'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='merchandiser'
    )

    # Preferences
    email_notifications = models.BooleanField(default=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
