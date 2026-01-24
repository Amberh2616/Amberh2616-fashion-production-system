"""
AI 分身視圖
Agent Views
"""

from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Agent, Memory
from .serializers import (
    AgentSerializer,
    AgentCreateSerializer,
    MemorySerializer,
    AgentPublicSerializer,
)


class MyAgentView(APIView):
    """我的 AI 分身"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """獲取我的 AI 分身"""
        try:
            agent = request.user.agent
            serializer = AgentSerializer(agent)
            return Response(serializer.data)
        except Agent.DoesNotExist:
            return Response(
                {"message": "尚未創建 AI 分身"},
                status=status.HTTP_404_NOT_FOUND
            )

    def post(self, request):
        """創建我的 AI 分身"""
        if hasattr(request.user, 'agent'):
            return Response(
                {"message": "已有 AI 分身"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AgentCreateSerializer(data=request.data)
        if serializer.is_valid():
            agent = serializer.save(user=request.user)
            return Response(
                AgentSerializer(agent).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        """更新我的 AI 分身"""
        try:
            agent = request.user.agent
        except Agent.DoesNotExist:
            return Response(
                {"message": "尚未創建 AI 分身"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AgentSerializer(agent, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AgentDetailView(APIView):
    """查看指定 AI 分身"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, agent_id):
        """獲取指定 AI 分身的公開資訊"""
        agent = get_object_or_404(Agent, id=agent_id)
        serializer = AgentPublicSerializer(agent)
        return Response(serializer.data)


class AgentMemoriesView(APIView):
    """AI 分身的記憶"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, agent_id):
        """獲取 AI 分身的記憶 (僅限自己的 AI)"""
        agent = get_object_or_404(Agent, id=agent_id)

        # 只能查看自己的 AI 記憶
        if agent.user != request.user:
            return Response(
                {"message": "無權查看"},
                status=status.HTTP_403_FORBIDDEN
            )

        memory_type = request.query_params.get('type')
        limit = int(request.query_params.get('limit', 50))

        memories = Memory.objects.filter(agent=agent)
        if memory_type:
            memories = memories.filter(type=memory_type)

        memories = memories.order_by('-created_at')[:limit]
        serializer = MemorySerializer(memories, many=True)
        return Response(serializer.data)


class AgentAutonomyView(APIView):
    """切換 AI 自主模式"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """切換自主/手動控制模式"""
        try:
            agent = request.user.agent
        except Agent.DoesNotExist:
            return Response(
                {"message": "尚未創建 AI 分身"},
                status=status.HTTP_404_NOT_FOUND
            )

        is_autonomous = request.data.get('is_autonomous', True)
        agent.is_autonomous = is_autonomous
        agent.save()

        return Response({
            "message": f"已切換為{'自主模式' if is_autonomous else '手動控制模式'}",
            "is_autonomous": agent.is_autonomous
        })
