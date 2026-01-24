"""
AI 分身 URL
Agent URLs
"""

from django.urls import path
from .views import (
    MyAgentView,
    AgentDetailView,
    AgentMemoriesView,
    AgentAutonomyView,
)

urlpatterns = [
    path('me/', MyAgentView.as_view(), name='my_agent'),
    path('autonomy/', AgentAutonomyView.as_view(), name='agent_autonomy'),
    path('<uuid:agent_id>/', AgentDetailView.as_view(), name='agent_detail'),
    path('<uuid:agent_id>/memories/', AgentMemoriesView.as_view(), name='agent_memories'),
]
