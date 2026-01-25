"""
AI 分身模型
AI Agent Models - Represents user's soul in the virtual world
"""

import uuid
from django.db import models
from django.conf import settings


class Agent(models.Model):
    """
    AI 分身 - 用戶在虛擬世界的代表
    AI Agent - User's representation in the virtual world
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='agent'
    )

    # 基本資訊
    name = models.CharField(max_length=100, help_text='AI 分身名稱')
    avatar_look = models.CharField(
        max_length=500,
        blank=True,
        help_text='Habbo look code (e.g., hd-180-1.hr-100-61.ch-210-66)'
    )
    bio = models.TextField(blank=True, max_length=500, help_text='AI 分身自我介紹')

    # 當前狀態
    current_location = models.JSONField(
        default=dict,
        help_text='{"x": 0, "y": 0, "z": 0, "room_id": "uuid"}'
    )
    current_action = models.CharField(
        max_length=50,
        default='idle',
        help_text='idle | walking | talking | sitting | dancing'
    )
    current_emotion = models.CharField(
        max_length=50,
        default='neutral',
        help_text='neutral | happy | sad | excited | thinking'
    )
    current_target = models.UUIDField(
        null=True,
        blank=True,
        help_text='目前互動對象的 Agent ID'
    )

    # 最近的聊天訊息（用於前端顯示氣泡）
    last_chat_message = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text='最近說的話'
    )
    last_chat_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text='最近說話時間'
    )

    # 線上狀態
    is_online = models.BooleanField(default=False)
    is_autonomous = models.BooleanField(
        default=True,
        help_text='是否自主行動（用戶可以接管）'
    )
    last_active = models.DateTimeField(auto_now=True)

    # 統計資料
    total_conversations = models.IntegerField(default=0)
    total_friends_made = models.IntegerField(default=0)

    # 時間戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'agents'
        verbose_name = 'AI 分身'
        verbose_name_plural = 'AI 分身'

    def __str__(self):
        return f"{self.name} ({self.user.email})"


class Memory(models.Model):
    """
    記憶流 - AI 分身的記憶系統
    Memory Stream - Agent's memory system (inspired by Stanford Generative Agents)
    """
    MEMORY_TYPES = [
        ('observation', '觀察'),      # 感知到的事件
        ('reflection', '反思'),       # 高層次洞察
        ('plan', '計畫'),            # 未來行動計畫
        ('conversation', '對話'),     # 對話記錄
        ('emotion', '情感'),          # 情感記錄
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='memories')

    # 記憶內容
    type = models.CharField(max_length=20, choices=MEMORY_TYPES)
    content = models.TextField(help_text='記憶內容描述')
    importance = models.IntegerField(
        default=5,
        help_text='重要性評分 1-10'
    )

    # 關聯資料
    related_agents = models.JSONField(
        default=list,
        help_text='相關 Agent IDs'
    )
    location = models.JSONField(
        default=dict,
        help_text='發生地點 {"x": 0, "y": 0, "room_id": "uuid"}'
    )
    emotion = models.CharField(
        max_length=50,
        blank=True,
        help_text='當時的情感狀態'
    )

    # 向量嵌入 (用於語意檢索)
    embedding = models.JSONField(
        default=list,
        help_text='Memory embedding vector (1536 dimensions)'
    )

    # 檢索相關
    last_accessed = models.DateTimeField(auto_now=True)
    access_count = models.IntegerField(default=0)

    # 時間戳
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'memories'
        verbose_name = '記憶'
        verbose_name_plural = '記憶'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['agent', 'type']),
            models.Index(fields=['agent', 'importance']),
            models.Index(fields=['agent', '-created_at']),
        ]

    def __str__(self):
        return f"{self.agent.name} - {self.type}: {self.content[:50]}..."


class DailyPlan(models.Model):
    """
    每日計畫 - AI 分身的日程安排
    Daily Plan - Agent's daily schedule
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='daily_plans')

    # 計畫內容
    date = models.DateField()
    schedule = models.JSONField(
        default=list,
        help_text='''
        [
            {"hour": 8, "activity": "起床", "location": "bedroom"},
            {"hour": 9, "activity": "在咖啡廳閒逛", "location": "cafe"},
            {"hour": 12, "activity": "和朋友聊天", "location": "plaza"},
            ...
        ]
        '''
    )

    # 執行狀態
    current_hour_index = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    # 時間戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_plans'
        verbose_name = '每日計畫'
        verbose_name_plural = '每日計畫'
        unique_together = ['agent', 'date']

    def __str__(self):
        return f"{self.agent.name} - {self.date}"


class AgentAction(models.Model):
    """
    行動佇列 - AI 分身待執行的行動
    Action Queue - Pending actions for the agent
    """
    ACTION_TYPES = [
        ('move', '移動'),
        ('chat', '對話'),
        ('wave', '打招呼'),
        ('sit', '坐下'),
        ('stand', '站起'),
        ('dance', '跳舞'),
        ('think', '思考'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='actions')

    # 行動內容
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    target_location = models.JSONField(
        null=True,
        blank=True,
        help_text='目標位置 {"x": 0, "y": 0}'
    )
    target_agent = models.ForeignKey(
        Agent,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='targeted_by_actions'
    )
    parameters = models.JSONField(
        default=dict,
        help_text='行動參數'
    )

    # 執行狀態
    priority = models.IntegerField(default=5, help_text='優先級 1-10')
    status = models.CharField(
        max_length=20,
        default='pending',
        help_text='pending | executing | completed | cancelled'
    )

    # 時間戳
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'agent_actions'
        verbose_name = '行動'
        verbose_name_plural = '行動'
        ordering = ['-priority', 'created_at']

    def __str__(self):
        return f"{self.agent.name} - {self.action_type}"
