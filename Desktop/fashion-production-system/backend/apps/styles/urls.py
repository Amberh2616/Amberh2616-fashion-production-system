"""
Styles app URLs - v2.2.1
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'styles', views.StyleViewSet, basename='styles')
router.register(r'style-revisions', views.StyleRevisionViewSet, basename='style-revisions')  # Fix: Avoid conflict with parsing/revisions
router.register(r'portfolio', views.PortfolioViewSet, basename='portfolio')  # Portfolio Kanban API

# Manually create nested BOM URLs
bom_list = views.BOMItemViewSet.as_view({
    'get': 'list',
    'post': 'create'
})
bom_detail = views.BOMItemViewSet.as_view({
    'get': 'retrieve',
    'patch': 'partial_update',
    'put': 'update',
    'delete': 'destroy'
})
bom_translate = views.BOMItemViewSet.as_view({
    'post': 'translate'
})
bom_translate_batch = views.BOMItemViewSet.as_view({
    'post': 'translate_batch'
})

# Manually create nested Measurement URLs
measurement_list = views.MeasurementViewSet.as_view({
    'get': 'list',
    'post': 'create'
})
measurement_detail = views.MeasurementViewSet.as_view({
    'get': 'retrieve',
    'patch': 'partial_update',
    'put': 'update',
    'delete': 'destroy'
})
measurement_translate = views.MeasurementViewSet.as_view({
    'post': 'translate'
})
measurement_translate_batch = views.MeasurementViewSet.as_view({
    'post': 'translate_batch'
})

urlpatterns = [
    path('', include(router.urls)),
    # Nested BOM routes under revisions
    path('style-revisions/<uuid:revision_pk>/bom/', bom_list, name='revision-bom-list'),
    path('style-revisions/<uuid:revision_pk>/bom/<uuid:pk>/', bom_detail, name='revision-bom-detail'),
    path('style-revisions/<uuid:revision_pk>/bom/<uuid:pk>/translate/', bom_translate, name='revision-bom-translate'),
    path('style-revisions/<uuid:revision_pk>/bom/translate-batch/', bom_translate_batch, name='revision-bom-translate-batch'),
    # Nested Measurement routes under revisions
    path('style-revisions/<uuid:revision_pk>/measurements/', measurement_list, name='revision-measurement-list'),
    path('style-revisions/<uuid:revision_pk>/measurements/<uuid:pk>/', measurement_detail, name='revision-measurement-detail'),
    path('style-revisions/<uuid:revision_pk>/measurements/<uuid:pk>/translate/', measurement_translate, name='revision-measurement-translate'),
    path('style-revisions/<uuid:revision_pk>/measurements/translate-batch/', measurement_translate_batch, name='revision-measurement-translate-batch'),
]
