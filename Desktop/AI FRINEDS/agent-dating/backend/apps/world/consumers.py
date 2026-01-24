"""
World WebSocket consumers
虛擬世界 WebSocket 消費者
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class WorldConsumer(AsyncWebsocketConsumer):
    """
    虛擬世界 WebSocket 消費者
    Handles real-time world updates (agent positions, actions, chat)
    """

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'world_{self.room_id}'
        self.user = self.scope['user']

        # 加入房間群組
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # 發送當前房間狀態
        room_state = await self.get_room_state()
        await self.send(text_data=json.dumps({
            'type': 'room_state',
            'data': room_state
        }))

    async def disconnect(self, close_code):
        # 離開房間群組
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """接收前端訊息"""
        data = json.loads(text_data)
        event_type = data.get('type')

        if event_type == 'move_agent':
            await self.handle_move_agent(data)
        elif event_type == 'agent_chat':
            await self.handle_agent_chat(data)
        elif event_type == 'agent_action':
            await self.handle_agent_action(data)

    async def handle_move_agent(self, data):
        """處理 Agent 移動"""
        agent_id = data.get('agent_id')
        target_x = data.get('x')
        target_y = data.get('y')

        # 檢查權限 (只能控制自己的 Agent 或手動接管)
        if not await self.can_control_agent(agent_id):
            return

        # 更新 Agent 位置
        await self.update_agent_position(agent_id, target_x, target_y)

        # 廣播位置更新
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'agent_position_update',
                'agent_id': agent_id,
                'x': target_x,
                'y': target_y,
            }
        )

    async def handle_agent_chat(self, data):
        """處理 Agent 對話"""
        agent_id = data.get('agent_id')
        message = data.get('message')

        # 廣播對話
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'agent_chat_bubble',
                'agent_id': agent_id,
                'message': message,
            }
        )

    async def handle_agent_action(self, data):
        """處理 Agent 動作"""
        agent_id = data.get('agent_id')
        action = data.get('action')  # wave, sit, dance, etc.

        # 廣播動作
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'agent_action_update',
                'agent_id': agent_id,
                'action': action,
            }
        )

    # === 事件處理器 (發送到客戶端) ===

    async def agent_position_update(self, event):
        """發送 Agent 位置更新"""
        await self.send(text_data=json.dumps({
            'type': 'agent_position',
            'agent_id': event['agent_id'],
            'x': event['x'],
            'y': event['y'],
        }))

    async def agent_chat_bubble(self, event):
        """發送 Agent 對話氣泡"""
        await self.send(text_data=json.dumps({
            'type': 'agent_chat',
            'agent_id': event['agent_id'],
            'message': event['message'],
        }))

    async def agent_action_update(self, event):
        """發送 Agent 動作更新"""
        await self.send(text_data=json.dumps({
            'type': 'agent_action',
            'agent_id': event['agent_id'],
            'action': event['action'],
        }))

    async def agent_enter_room(self, event):
        """發送 Agent 進入房間"""
        await self.send(text_data=json.dumps({
            'type': 'agent_enter',
            'agent': event['agent'],
        }))

    async def agent_leave_room(self, event):
        """發送 Agent 離開房間"""
        await self.send(text_data=json.dumps({
            'type': 'agent_leave',
            'agent_id': event['agent_id'],
        }))

    # === 資料庫操作 ===

    @database_sync_to_async
    def get_room_state(self):
        """獲取房間當前狀態"""
        from .models import Room, AgentPosition

        try:
            room = Room.objects.get(id=self.room_id)
            positions = AgentPosition.objects.filter(room=room).select_related('agent')

            agents = []
            for pos in positions:
                agents.append({
                    'id': str(pos.agent.id),
                    'name': pos.agent.name,
                    'look': pos.agent.avatar_look,
                    'x': pos.x,
                    'y': pos.y,
                    'direction': pos.direction,
                    'action': pos.agent.current_action,
                    'emotion': pos.agent.current_emotion,
                })

            return {
                'room': {
                    'id': str(room.id),
                    'name': room.name,
                    'type': room.room_type,
                    'width': room.width,
                    'height': room.height,
                    'floor_plan': room.floor_plan,
                    'furniture': room.furniture,
                },
                'agents': agents,
            }
        except Room.DoesNotExist:
            return None

    @database_sync_to_async
    def can_control_agent(self, agent_id):
        """檢查是否可以控制該 Agent"""
        from apps.agents.models import Agent
        try:
            agent = Agent.objects.get(id=agent_id)
            return agent.user_id == self.user.id
        except Agent.DoesNotExist:
            return False

    @database_sync_to_async
    def update_agent_position(self, agent_id, x, y):
        """更新 Agent 位置"""
        from .models import AgentPosition
        AgentPosition.objects.filter(agent_id=agent_id).update(
            target_x=x,
            target_y=y,
            is_moving=True
        )
