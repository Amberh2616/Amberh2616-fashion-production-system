from rest_framework import viewsets
from .models import ExtractionRun, DraftReviewItem
from .serializers import ExtractionRunSerializer, DraftReviewItemSerializer


class ExtractionRunViewSet(viewsets.ModelViewSet):
    queryset = ExtractionRun.objects.all()
    serializer_class = ExtractionRunSerializer


class DraftReviewItemViewSet(viewsets.ModelViewSet):
    queryset = DraftReviewItem.objects.all()
    serializer_class = DraftReviewItemSerializer
