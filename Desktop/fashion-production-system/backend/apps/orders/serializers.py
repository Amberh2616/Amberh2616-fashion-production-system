from rest_framework import serializers
from .models import SalesOrder, SalesOrderItem


class SalesOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrderItem
        fields = '__all__'


class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = SalesOrder
        fields = '__all__'
