"""
Core serializers
"""

from rest_framework import serializers
from .models import Organization, User


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'ai_budget_monthly', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'organization', 'organization_name', 'role',
            'email_notifications', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']
