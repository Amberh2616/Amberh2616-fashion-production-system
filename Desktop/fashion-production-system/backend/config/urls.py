"""
URL configuration for Fashion Production System v2.2.1
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers
# TODO: Add drf_spectacular to requirements, then uncomment
# from drf_spectacular.views import (
#     SpectacularAPIView,
#     SpectacularRedocView,
#     SpectacularSwaggerView,
# )

# API Router
router = routers.DefaultRouter()

# TODO: Register app viewsets here as they are created
# Example:
# from apps.styles.views import StyleViewSet
# router.register(r'styles', StyleViewSet)

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # API v2 - App routes
    path("api/v2/", include("apps.styles.urls")),
    path("api/v2/", include("apps.documents.urls")),
    path("api/v2/", include("apps.parsing.urls")),

    # API Documentation (TODO: Uncomment when drf_spectacular is added)
    # path("api/v2/schema/", SpectacularAPIView.as_view(), name="schema"),
    # path("api/v2/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # path("api/v2/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Health check
    path("health/", include("apps.core.urls")),

    # DRF auth
    path("api-auth/", include("rest_framework.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
