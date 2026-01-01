"""
Phase 3: Sample Request System - API URLs
Day 3 MVP API + SampleRun (Phase 3 Refactor)
P0-2: Kanban View API
"""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    SampleRequestViewSet,
    SampleRunViewSet,
    SampleActualsViewSet,
    SampleAttachmentViewSet,
    SampleCostEstimateViewSet,
    T2POForSampleViewSet,
    T2POLineForSampleViewSet,
    SampleMWOViewSet,
    SampleViewSet,
    # P0-2: Kanban
    kanban_counts,
    kanban_runs,
)

router = DefaultRouter()

# Sample Request (core)
router.register(
    r"sample-requests",
    SampleRequestViewSet,
    basename="sample-request"
)

# ==================== Phase 3 Refactor: SampleRun ====================

# Sample Run (Phase 3: 每一輪樣衣的核心中樞)
router.register(
    r"sample-runs",
    SampleRunViewSet,
    basename="sample-run"
)

# Sample Actuals
router.register(
    r"sample-actuals",
    SampleActualsViewSet,
    basename="sample-actuals"
)

# Sample Attachments
router.register(
    r"sample-attachments",
    SampleAttachmentViewSet,
    basename="sample-attachment"
)

# Sample Cost Estimates
router.register(
    r"sample-cost-estimates",
    SampleCostEstimateViewSet,
    basename="sample-cost-estimate"
)

# T2 PO for Sample
router.register(
    r"t2pos-for-sample",
    T2POForSampleViewSet,
    basename="t2po-for-sample"
)

router.register(
    r"t2po-lines-for-sample",
    T2POLineForSampleViewSet,
    basename="t2po-line-for-sample"
)

# Sample MWO
router.register(
    r"sample-mwos",
    SampleMWOViewSet,
    basename="sample-mwo"
)

# Physical Samples
router.register(
    r"samples",
    SampleViewSet,
    basename="sample"
)

# P0-2: Kanban API endpoints
urlpatterns = [
    path('kanban/counts/', kanban_counts, name='kanban-counts'),
    path('kanban/runs/', kanban_runs, name='kanban-runs'),
] + router.urls
