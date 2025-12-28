"""
Styles app URLs - v2.2.1
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'styles', views.StyleViewSet, basename='styles')
router.register(r'style-revisions', views.StyleRevisionViewSet, basename='style-revisions')  # Fix: Avoid conflict with parsing/revisions

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

urlpatterns = [
    path('', include(router.urls)),
    # Nested BOM routes under revisions
    path('style-revisions/<uuid:revision_pk>/bom/', bom_list, name='revision-bom-list'),
    path('style-revisions/<uuid:revision_pk>/bom/<uuid:pk>/', bom_detail, name='revision-bom-detail'),
]
