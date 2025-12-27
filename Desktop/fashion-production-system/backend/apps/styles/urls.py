"""
Styles app URLs - v2.2.1
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'styles', views.StyleViewSet, basename='styles')
router.register(r'style-revisions', views.StyleRevisionViewSet, basename='style-revisions')  # Fix: Avoid conflict with parsing/revisions

urlpatterns = [
    path('', include(router.urls)),
]
