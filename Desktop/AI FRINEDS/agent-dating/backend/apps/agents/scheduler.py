"""
APScheduler 調度器
Agent Scheduler - Windows-friendly alternative to Celery Beat

使用方式:
    python manage.py runscheduler

或在 Django 啟動時自動啟動 (settings.py 中配置)
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from django.conf import settings

logger = logging.getLogger(__name__)

# 全局調度器實例
scheduler = None


def start_scheduler():
    """
    啟動 APScheduler

    調度任務:
    - run_agent_simulation: 每 5 秒執行一次
    """
    global scheduler

    if scheduler is not None:
        logger.warning("Scheduler already running")
        return

    scheduler = BackgroundScheduler()

    # 添加 Agent 模擬任務
    scheduler.add_job(
        run_simulation_job,
        trigger=IntervalTrigger(seconds=5),
        id='agent_simulation',
        name='Agent Simulation Tick',
        replace_existing=True,
        max_instances=1,  # 確保不會重複執行
    )

    # 添加清理任務 (每小時)
    scheduler.add_job(
        cleanup_job,
        trigger=IntervalTrigger(hours=1),
        id='cleanup',
        name='Hourly Cleanup',
        replace_existing=True,
    )

    # 添加 AI 代聊觸發任務 (每小時)
    scheduler.add_job(
        trigger_ai_conversations_job,
        trigger=IntervalTrigger(hours=1),
        id='ai_conversations',
        name='AI Conversation Trigger',
        replace_existing=True,
    )

    scheduler.start()
    logger.info("APScheduler started with agent simulation every 5 seconds")


def stop_scheduler():
    """停止調度器"""
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        scheduler = None
        logger.info("APScheduler stopped")


def run_simulation_job():
    """
    執行 Agent 模擬 (由 APScheduler 調用)

    注意: 這會觸發 Celery 任務，所以仍需要 Celery worker 運行
    """
    from .tasks import run_agent_simulation

    try:
        # 使用 Celery 異步執行
        run_agent_simulation.delay()
    except Exception as e:
        logger.error(f"Error triggering agent simulation: {e}")

        # Celery 不可用時，直接執行 (同步)
        try:
            run_agent_simulation()
        except Exception as e2:
            logger.error(f"Error running agent simulation directly: {e2}")


def trigger_ai_conversations_job():
    """
    觸發 AI 代聊任務 (由 APScheduler 調用)

    注意: 這會觸發 Celery 任務
    """
    from .tasks import trigger_scheduled_ai_conversations

    try:
        # 使用 Celery 異步執行
        trigger_scheduled_ai_conversations.delay()
    except Exception as e:
        logger.error(f"Error triggering AI conversations: {e}")

        # Celery 不可用時，直接執行 (同步)
        try:
            trigger_scheduled_ai_conversations()
        except Exception as e2:
            logger.error(f"Error running AI conversations directly: {e2}")


def cleanup_job():
    """
    清理任務
    - 刪除舊的 AgentAction 記錄
    - 清理過期的快取
    """
    from .models import AgentAction
    from django.utils import timezone
    from datetime import timedelta

    try:
        # 刪除 24 小時前的已完成動作
        old_actions = AgentAction.objects.filter(
            status='completed',
            completed_at__lt=timezone.now() - timedelta(hours=24)
        )
        count = old_actions.count()
        old_actions.delete()

        if count > 0:
            logger.info(f"Cleaned up {count} old agent actions")

    except Exception as e:
        logger.error(f"Error in cleanup job: {e}")


# Django 管理命令 runscheduler
class Command:
    """
    Django 管理命令: python manage.py runscheduler

    用法:
        python manage.py runscheduler
    """
    help = 'Starts the APScheduler for agent simulation'

    def handle(self, *args, **options):
        import signal
        import sys

        logger.info("Starting agent scheduler...")

        def signal_handler(signum, frame):
            logger.info("Received shutdown signal")
            stop_scheduler()
            sys.exit(0)

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        start_scheduler()

        # 保持運行
        import time
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            stop_scheduler()
