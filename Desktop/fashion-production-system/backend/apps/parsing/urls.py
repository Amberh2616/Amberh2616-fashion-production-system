from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'extraction-runs', views.ExtractionRunViewSet)
router.register(r'review-items', views.DraftReviewItemViewSet)

# Block-Based Parsing APIs
router.register(r'revisions', views.RevisionViewSet, basename='revision')
router.register(r'draft-blocks', views.DraftBlockViewSet, basename='draftblock')

urlpatterns = [
    path('', include(router.urls)),
]
