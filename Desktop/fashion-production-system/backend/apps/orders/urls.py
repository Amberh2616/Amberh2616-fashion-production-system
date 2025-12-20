from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'sales-orders', views.SalesOrderViewSet)
router.register(r'order-items', views.SalesOrderItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
