"""
Styles app URLs - v2.2.1
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'styles', views.StyleViewSet, basename='styles')
router.register(r'revisions', views.StyleRevisionViewSet, basename='revisions')

urlpatterns = [
    path('', include(router.urls)),
]
