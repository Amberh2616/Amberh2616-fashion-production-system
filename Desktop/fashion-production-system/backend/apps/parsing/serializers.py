"""
Parsing Serializers - v2.2.1
"""

from rest_framework import serializers
from .models import ExtractionRun, DraftReviewItem


class ParseTriggerSerializer(serializers.Serializer):
    """Parse trigger request"""
    targets = serializers.ListField(
        child=serializers.ChoiceField(choices=['bom', 'measurement', 'construction']),
        required=False,
        default=list,
        help_text="Targets to parse. Empty = all targets"
    )
    options = serializers.DictField(
        required=False,
        default=dict,
        help_text="Additional options"
    )


class ParseTriggerResponseSerializer(serializers.Serializer):
    """Parse trigger response"""
    extraction_run_id = serializers.UUIDField()
    job_id = serializers.UUIDField()
    status = serializers.CharField()
    message = serializers.CharField()


class ExtractionRunDetailSerializer(serializers.Serializer):
    """Extraction run status detail"""
    extraction_run_id = serializers.UUIDField()
    revision_id = serializers.UUIDField()
    status = serializers.CharField()
    ai_model = serializers.CharField()
    confidence_score = serializers.FloatField(allow_null=True)
    processing_time_ms = serializers.IntegerField(allow_null=True)
    api_cost = serializers.FloatField(allow_null=True)
    started_at = serializers.CharField(allow_null=True)
    completed_at = serializers.CharField(allow_null=True)
    targets = serializers.ListField(child=serializers.CharField())
    issues_summary = serializers.DictField()
    issues = serializers.ListField()


class DraftReviewItemSerializer(serializers.ModelSerializer):
    """Draft review item"""
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = DraftReviewItem
        fields = [
            'id', 'extraction_run', 'item_type', 'item_type_display',
            'ai_data', 'ai_confidence', 'status', 'status_display',
            'corrected_data', 'correction_notes',
            'reviewed_by', 'reviewed_at',
        ]
        read_only_fields = ['id', 'reviewed_at']


class ExtractionRunSerializer(serializers.ModelSerializer):
    """Full extraction run serializer"""
    review_items = DraftReviewItemSerializer(many=True, read_only=True)

    class Meta:
        model = ExtractionRun
        fields = '__all__'
