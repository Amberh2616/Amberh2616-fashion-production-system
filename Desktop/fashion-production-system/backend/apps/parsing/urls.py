from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'extraction-runs', views.ExtractionRunViewSet)
router.register(r'review-items', views.DraftReviewItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
