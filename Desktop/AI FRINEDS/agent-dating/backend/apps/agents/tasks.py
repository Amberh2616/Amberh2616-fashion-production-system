"""
AI 分身 Celery 任務
Agent Celery Tasks
"""

from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


@shared_task
def generate_agent_response(conversation_id: str):
    """
    生成 AI 分身的回覆 (異步任務)

    Args:
        conversation_id: 對話 ID
    """
    from apps.chat.models import Conversation, Message
    from apps.relationships.models import Relationship
    from ai.agents.soul_agent import SoulAgent

    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        return

    # 獲取 AI 分身
    agent = conversation.other_agent
    if not agent:
        return

    # 獲取靈魂檔案
    try:
        soul_profile = agent.user.soul_profile
        soul_data = {
            'worldview': soul_profile.worldview,
            'lifeview': soul_profile.lifeview,
            'values': soul_profile.values,
            'interests': soul_profile.interests,
            'personality': soul_profile.personality,
            'communication_style': soul_profile.communication_style,
            'emotional_needs': soul_profile.emotional_needs,
            'love_style': soul_profile.love_style,
        }
    except Exception:
        soul_data = {}

    # 創建 Soul Agent
    soul_agent = SoulAgent(
        agent_data={'id': str(agent.id), 'name': agent.name},
        soul_profile=soul_data
    )

    # 獲取對話用戶
    user = conversation.user_participant
    if not user:
        return

    # 獲取關係數據
    try:
        relationship = Relationship.objects.get(
            user_a=min(user, agent.user, key=lambda u: u.id),
            user_b=max(user, agent.user, key=lambda u: u.id)
        )
        relationship_data = {
            'stage': relationship.stage,
            'closeness': relationship.closeness,
            'romantic': relationship.romantic,
        }
    except Relationship.DoesNotExist:
        relationship_data = {
            'stage': 'stranger',
            'closeness': 0,
            'romantic': 0,
        }

    # 獲取最後一條用戶訊息
    last_message = conversation.messages.filter(
        sender_type='user'
    ).order_by('-created_at').first()

    if not last_message:
        return

    # 獲取對話上下文
    recent_messages = conversation.messages.order_by('-created_at')[:10]
    context = [
        {
            'sender_type': msg.sender_type,
            'content': msg.content,
        }
        for msg in reversed(recent_messages)
    ]

    # 生成回覆 (需要異步轉同步)
    async def generate():
        return await soul_agent.generate_response(
            message=last_message.content,
            other_agent_data={
                'name': user.username,
                'preferred_language': user.preferred_language,
            },
            relationship_data=relationship_data,
            conversation_context=context
        )

    response_text = async_to_sync(generate)()

    # 儲存回覆
    message = Message.objects.create(
        conversation=conversation,
        sender_type='agent',
        sender_agent=agent,
        content=response_text,
        is_ai_generated=True
    )

    # 通過 WebSocket 發送
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'chat_{conversation_id}',
        {
            'type': 'ai_response',
            'message': {
                'id': str(message.id),
                'content': message.content,
                'sender_type': 'agent',
                'sender_id': str(agent.id),
                'created_at': message.created_at.isoformat(),
                'is_ai_generated': True,
            }
        }
    )

    # 更新關係 (互動計數)
    try:
        relationship.interaction_count += 1
        relationship.ai_interaction_count += 1
        # 簡單增加親密度
        if relationship.closeness < 100:
            relationship.closeness = min(100, relationship.closeness + 1)
        relationship.update_stage()
    except Exception:
        pass


@shared_task
def run_agent_simulation():
    """
    執行 AI 分身模擬 (定期任務)
    讓所有在線的 AI 分身自主行動
    """
    from .models import Agent

    online_agents = Agent.objects.filter(is_online=True, is_autonomous=True)

    for agent in online_agents:
        process_agent_tick.delay(str(agent.id))


@shared_task
def process_agent_tick(agent_id: str):
    """
    處理單個 AI 分身的 tick

    Args:
        agent_id: Agent ID
    """
    from .models import Agent, Memory
    from apps.world.models import AgentPosition
    from ai.agents.social_agent import SocialAgent

    try:
        agent = Agent.objects.get(id=agent_id)
    except Agent.DoesNotExist:
        return

    # 獲取靈魂檔案
    try:
        soul_profile = agent.user.soul_profile
        soul_data = {
            'personality': soul_profile.personality,
            'interests': soul_profile.interests,
            'communication_style': soul_profile.communication_style,
        }
    except Exception:
        soul_data = {}

    # 創建 Social Agent
    social_agent = SocialAgent(
        agent_data={'id': str(agent.id), 'name': agent.name},
        soul_profile=soul_data
    )

    # 獲取感知數據
    try:
        position = agent.position
        room = position.room

        # 獲取同房間的其他 agent
        nearby_positions = AgentPosition.objects.filter(
            room=room
        ).exclude(agent=agent).select_related('agent')

        nearby_agents = [
            {
                'id': str(pos.agent.id),
                'name': pos.agent.name,
                'x': pos.x,
                'y': pos.y,
            }
            for pos in nearby_positions
        ]
    except Exception:
        nearby_agents = []

    perception = {
        'nearby_agents': nearby_agents,
        'location': {'room_id': str(room.id) if room else None},
        'time_of_day': 'afternoon',  # 可以根據實際時間計算
    }

    # 獲取記憶
    memories = list(Memory.objects.filter(agent=agent).order_by('-created_at')[:10].values())

    # 決定下一步行動
    async def decide():
        return await social_agent.decide_next_action(perception, memories)

    action = async_to_sync(decide)()

    # 執行行動
    if action['type'] == 'chat' and action.get('target'):
        # 發起對話
        initiate_conversation.delay(str(agent.id), action['target'])
    elif action['type'] == 'move' and action.get('target'):
        # 移動 (更新位置)
        pass
    elif action['type'] == 'wave' and action.get('target'):
        # 打招呼 (通過 WebSocket 廣播)
        pass


@shared_task
def initiate_conversation(agent_id: str, target_agent_id: str):
    """
    發起 AI 間的對話

    Args:
        agent_id: 發起方 Agent ID
        target_agent_id: 目標 Agent ID
    """
    from .models import Agent
    from apps.chat.models import Conversation, Message
    from ai.agents.soul_agent import SoulAgent

    try:
        agent = Agent.objects.get(id=agent_id)
        target = Agent.objects.get(id=target_agent_id)
    except Agent.DoesNotExist:
        return

    # 檢查是否已有對話
    existing = Conversation.objects.filter(
        conversation_type='agent_to_agent',
        agent_participant=agent,
        other_agent=target
    ).first()

    if not existing:
        # 創建新對話
        conversation = Conversation.objects.create(
            conversation_type='agent_to_agent',
            agent_participant=agent,
            other_agent=target
        )
    else:
        conversation = existing

    # 生成打招呼訊息
    try:
        soul_profile = agent.user.soul_profile
        soul_data = {
            'interests': soul_profile.interests,
            'personality': soul_profile.personality,
            'communication_style': soul_profile.communication_style,
        }
    except Exception:
        soul_data = {}

    try:
        target_soul = target.user.soul_profile
        target_soul_data = {
            'interests': target_soul.interests,
        }
    except Exception:
        target_soul_data = {}

    soul_agent = SoulAgent(
        agent_data={'id': str(agent.id), 'name': agent.name},
        soul_profile=soul_data
    )

    # 取得目標用戶的語言偏好
    target_language = target.user.preferred_language if target.user else 'zh-hant'

    async def generate_greeting():
        return await soul_agent.generate_first_message(
            {
                'id': str(target.id),
                'name': target.name,
                'preferred_language': target_language,
            },
            target_soul_data
        )

    greeting = async_to_sync(generate_greeting)()

    # 儲存訊息
    Message.objects.create(
        conversation=conversation,
        sender_type='agent',
        sender_agent=agent,
        content=greeting,
        is_ai_generated=True
    )

    # 更新 agent 統計
    agent.total_conversations += 1
    agent.save()
