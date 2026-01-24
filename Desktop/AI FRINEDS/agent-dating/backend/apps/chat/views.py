"""
聊天系統視圖
Chat Views
"""

from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Conversation, Message
from apps.agents.models import Agent


class ConversationListView(APIView):
    """對話列表"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """獲取我的對話列表"""
        user = request.user

        # 獲取用戶參與的對話
        conversations = Conversation.objects.filter(
            Q(user_participant=user) | Q(other_user=user)
        ).order_by('-last_message_at')

        data = []
        for conv in conversations:
            # 確定對方
            if conv.conversation_type == 'user_to_agent':
                other_agent = conv.other_agent
                other_info = {
                    'type': 'agent',
                    'id': str(other_agent.id) if other_agent else None,
                    'name': other_agent.name if other_agent else 'Unknown',
                    'avatar': other_agent.avatar_look if other_agent else None,
                }
            elif conv.conversation_type == 'user_to_user':
                other_user = conv.other_user if conv.user_participant == user else conv.user_participant
                other_info = {
                    'type': 'user',
                    'id': str(other_user.id) if other_user else None,
                    'name': other_user.username if other_user else 'Unknown',
                }
            else:
                other_info = {'type': 'unknown'}

            data.append({
                'id': str(conv.id),
                'type': conv.conversation_type,
                'other': other_info,
                'last_message': conv.last_message_preview,
                'last_message_at': conv.last_message_at.isoformat() if conv.last_message_at else None,
                'unread_count': conv.unread_count,
                'message_count': conv.message_count,
            })

        return Response({'conversations': data})


class ConversationDetailView(APIView):
    """對話詳情"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id):
        """獲取對話訊息"""
        user = request.user
        conversation = get_object_or_404(Conversation, id=conversation_id)

        # 檢查權限
        if conversation.user_participant != user and conversation.other_user != user:
            return Response(
                {"message": "無權訪問此對話"},
                status=status.HTTP_403_FORBIDDEN
            )

        # 分頁參數
        limit = int(request.query_params.get('limit', 50))
        before = request.query_params.get('before')  # message_id

        messages = conversation.messages.all()
        if before:
            try:
                before_msg = Message.objects.get(id=before)
                messages = messages.filter(created_at__lt=before_msg.created_at)
            except Message.DoesNotExist:
                pass

        messages = messages.order_by('-created_at')[:limit]

        data = []
        for msg in reversed(messages):
            sender_info = {}
            if msg.sender_type == 'user':
                sender_info = {
                    'type': 'user',
                    'id': str(msg.sender_user_id) if msg.sender_user_id else None,
                    'name': msg.sender_user.username if msg.sender_user else 'Unknown',
                }
            else:
                sender_info = {
                    'type': 'agent',
                    'id': str(msg.sender_agent_id) if msg.sender_agent_id else None,
                    'name': msg.sender_agent.name if msg.sender_agent else 'AI',
                }

            data.append({
                'id': str(msg.id),
                'sender': sender_info,
                'content': msg.content,
                'message_type': msg.message_type,
                'emotion': msg.emotion,
                'is_ai_generated': msg.is_ai_generated,
                'is_read': msg.is_read,
                'created_at': msg.created_at.isoformat(),
            })

        return Response({
            'conversation_id': str(conversation.id),
            'messages': data,
            'has_more': messages.count() == limit,
        })


class StartChatWithAgentView(APIView):
    """開始和某人的 AI 聊天"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, agent_id):
        """開始與指定 AI 分身的對話"""
        user = request.user
        agent = get_object_or_404(Agent, id=agent_id)

        # 不能和自己的 AI 聊天
        if agent.user == user:
            return Response(
                {"message": "無法與自己的 AI 分身聊天"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 查找或創建對話
        conversation, created = Conversation.objects.get_or_create(
            conversation_type='user_to_agent',
            user_participant=user,
            other_agent=agent
        )

        return Response({
            'conversation_id': str(conversation.id),
            'created': created,
            'agent': {
                'id': str(agent.id),
                'name': agent.name,
                'avatar_look': agent.avatar_look,
                'bio': agent.bio,
            }
        })


class SendMessageView(APIView):
    """發送訊息"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        """發送訊息到對話"""
        user = request.user
        conversation = get_object_or_404(Conversation, id=conversation_id)

        # 檢查權限
        if conversation.user_participant != user:
            return Response(
                {"message": "無權發送訊息"},
                status=status.HTTP_403_FORBIDDEN
            )

        content = request.data.get('content', '').strip()
        if not content:
            return Response(
                {"message": "訊息內容不能為空"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 創建訊息
        message = Message.objects.create(
            conversation=conversation,
            sender_type='user',
            sender_user=user,
            content=content,
            is_ai_generated=False
        )

        # 觸發 AI 回覆 (如果是和 AI 對話)
        if conversation.conversation_type == 'user_to_agent':
            from apps.agents.tasks import generate_agent_response
            generate_agent_response.delay(str(conversation.id))

        return Response({
            'message_id': str(message.id),
            'content': message.content,
            'created_at': message.created_at.isoformat(),
        })
