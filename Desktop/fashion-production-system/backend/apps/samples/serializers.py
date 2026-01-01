"""
Phase 3: Sample Request System - DRF Serializers
Day 3 MVP API + SampleRun (Phase 3 Refactor)
"""

from rest_framework import serializers

from .models import (
    SampleRequest,
    SampleRun,
    SampleActuals,
    SampleCostEstimate,
    T2POForSample,
    T2POLineForSample,
    SampleMWO,
    Sample,
    SampleAttachment,
    SampleRequestStatus,
    SampleRunStatus,
)


# Fields that should be read-only after submission (non-draft status)
READ_ONLY_ON_SUBMITTED = {
    "revision",
    "brand_name",
    "request_type",
    "request_type_custom",
    "quantity_requested",
    "need_quote_first",
}


class SafeModelSerializer(serializers.ModelSerializer):
    """
    Base serializer with protection:
    - Prevents modifying sensitive fields after status changes from draft
    - Enforces Phase 2/3 boundary rules
    """

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        if not instance:
            # New instance - no restrictions
            return attrs

        # Check current status
        current_status = getattr(instance, "status", None)
        if current_status and current_status != SampleRequestStatus.DRAFT:
            # Non-draft status: prohibit changing sensitive fields
            forbidden = READ_ONLY_ON_SUBMITTED.intersection(set(attrs.keys()))
            if forbidden:
                raise serializers.ValidationError({
                    f: f"Cannot modify '{f}' after submission (current status: {current_status})"
                    for f in forbidden
                })

        return attrs


class SampleAttachmentSerializer(serializers.ModelSerializer):
    """
    Attachments for Sample Requests or Physical Samples
    """
    class Meta:
        model = SampleAttachment
        fields = "__all__"
        read_only_fields = ("id", "uploaded_at")


class SampleCostEstimateSerializer(serializers.ModelSerializer):
    """
    Sample Quote/Estimate
    Supports multiple versions, flexible JSON breakdown
    """
    class Meta:
        model = SampleCostEstimate
        fields = "__all__"
        read_only_fields = ("id", "snapshot_hash", "created_at", "updated_at")


class T2POLineForSampleSerializer(serializers.ModelSerializer):
    """
    T2 PO Line for Sample (snapshot fields - NO FK to BOMItem)
    """
    class Meta:
        model = T2POLineForSample
        fields = "__all__"


class T2POForSampleSerializer(serializers.ModelSerializer):
    """
    T2 PO for Sample with nested lines
    """
    lines = T2POLineForSampleSerializer(many=True, read_only=True)

    class Meta:
        model = T2POForSample
        fields = "__all__"
        read_only_fields = ("id", "snapshot_at", "snapshot_hash", "created_at", "updated_at")


class SampleMWOSerializer(serializers.ModelSerializer):
    """
    Sample Manufacturing Work Order
    """
    class Meta:
        model = SampleMWO
        fields = "__all__"
        read_only_fields = ("id", "snapshot_at", "snapshot_hash", "created_at", "updated_at")


class SampleSerializer(serializers.ModelSerializer):
    """
    Physical Sample with attachments
    """
    attachments = SampleAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Sample
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")


class SampleRequestListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list view
    """
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SampleRequest
        fields = [
            "id",
            "revision",
            "brand_name",
            "request_type",
            "request_type_display",
            "quantity_requested",
            "status",
            "status_display",
            "priority",
            "due_date",
            "need_quote_first",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at", "status_updated_at")


class SampleRequestSerializer(SafeModelSerializer):
    """
    Full SampleRequest serializer with nested relationships
    """
    # Nested read-only relationships
    attachments = SampleAttachmentSerializer(many=True, read_only=True)
    estimates = SampleCostEstimateSerializer(many=True, read_only=True)
    samples = SampleSerializer(many=True, read_only=True)
    # Note: mwos and t2pos are now on SampleRun, not SampleRequest

    # Display fields
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = SampleRequest
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "status_updated_at")

    def validate(self, attrs):
        # Call parent validation (SafeModelSerializer)
        attrs = super().validate(attrs)

        # Additional validation: custom type requires custom label
        request_type = attrs.get('request_type', None)
        request_type_custom = attrs.get('request_type_custom', '')

        # If creating new instance, check initial data
        if not self.instance:
            if request_type == 'custom' and not request_type_custom:
                raise serializers.ValidationError({
                    'request_type_custom': 'This field is required when request_type is "custom".'
                })

        return attrs


# ==================== Phase 3 Refactor: SampleRun ====================

class SampleActualsSerializer(serializers.ModelSerializer):
    """
    Sample Actuals - 樣衣完成後回填的實際數據
    """
    class Meta:
        model = SampleActuals
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")


class SampleRunListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for SampleRun list view
    """
    run_type_display = serializers.CharField(source='get_run_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SampleRun
        fields = [
            "id",
            "sample_request",
            "run_no",
            "run_type",
            "run_type_display",
            "revision",
            "quantity",
            "target_due_date",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at", "status_updated_at")


class SampleRunSerializer(serializers.ModelSerializer):
    """
    Full SampleRun serializer with nested relationships
    """
    # Nested read-only relationships
    actuals = SampleActualsSerializer(read_only=True)
    t2pos = T2POForSampleSerializer(many=True, read_only=True)
    mwos = SampleMWOSerializer(many=True, read_only=True)

    # Display fields
    run_type_display = serializers.CharField(source='get_run_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SampleRun
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "status_updated_at")
