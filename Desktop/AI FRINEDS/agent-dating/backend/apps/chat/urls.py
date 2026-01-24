"""
聊天系統 URL
Chat URLs
"""

from django.urls import path
from .views import (
    ConversationListView,
    ConversationDetailView,
    StartChatWithAgentView,
    SendMessageView,
)

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversation_list'),
    path('conversations/<uuid:conversation_id>/', ConversationDetailView.as_view(), name='conversation_detail'),
    path('conversations/<uuid:conversation_id>/send/', SendMessageView.as_view(), name='send_message'),
    path('start/<uuid:agent_id>/', StartChatWithAgentView.as_view(), name='start_chat'),
]
