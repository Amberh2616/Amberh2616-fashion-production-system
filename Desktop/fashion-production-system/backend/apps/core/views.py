"""
Core views - Health check and basic utilities
"""

from django.http import JsonResponse
from django.db import connection
from django.conf import settings
import redis
import logging

logger = logging.getLogger(__name__)


def health_check(request):
    """
    Health check endpoint for load balancers and monitoring
    """
    try:
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        return JsonResponse({
            'status': 'healthy',
            'database': 'connected'
        })
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e)
        }, status=500)


def services_health_check(request):
    """
    Detailed health check for async processing services (Redis + Celery)
    Used by frontend to show service status before triggering async tasks.

    Returns:
        - database: Database connection status
        - redis: Redis connection status
        - celery: Celery worker status
        - async_ready: Whether async processing is available
    """
    result = {
        'database': {'status': 'unknown', 'message': ''},
        'redis': {'status': 'unknown', 'message': ''},
        'celery': {'status': 'unknown', 'message': ''},
        'async_ready': False,
    }

    # 1. Check Database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        result['database'] = {'status': 'ok', 'message': 'Connected'}
    except Exception as e:
        result['database'] = {'status': 'error', 'message': str(e)}

    # 2. Check Redis
    try:
        broker_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/0')
        # Parse Redis URL
        if broker_url.startswith('redis://'):
            # Simple parse: redis://localhost:6379/0
            parts = broker_url.replace('redis://', '').split('/')
            host_port = parts[0].split(':')
            host = host_port[0] or 'localhost'
            port = int(host_port[1]) if len(host_port) > 1 else 6379
            db = int(parts[1]) if len(parts) > 1 else 0

            r = redis.Redis(host=host, port=port, db=db, socket_timeout=2)
            r.ping()
            result['redis'] = {'status': 'ok', 'message': f'Connected to {host}:{port}'}
        else:
            result['redis'] = {'status': 'warning', 'message': 'Non-Redis broker configured'}
    except redis.ConnectionError as e:
        result['redis'] = {'status': 'error', 'message': 'Redis not running. Start with: redis-server'}
    except Exception as e:
        result['redis'] = {'status': 'error', 'message': str(e)}

    # 3. Check Celery Worker
    try:
        from config.celery import app as celery_app

        # Inspect active workers (timeout 2 seconds)
        inspector = celery_app.control.inspect(timeout=2)
        active_workers = inspector.active()

        if active_workers:
            worker_count = len(active_workers)
            worker_names = list(active_workers.keys())
            result['celery'] = {
                'status': 'ok',
                'message': f'{worker_count} worker(s) online',
                'workers': worker_names
            }
        else:
            result['celery'] = {
                'status': 'error',
                'message': 'No workers online. Start with: celery -A config worker -l info --pool=solo'
            }
    except Exception as e:
        error_msg = str(e)
        if 'redis' in error_msg.lower() or 'connection' in error_msg.lower():
            result['celery'] = {'status': 'error', 'message': 'Cannot connect (Redis required)'}
        else:
            result['celery'] = {'status': 'error', 'message': error_msg}

    # 4. Determine if async is ready
    result['async_ready'] = (
        result['redis']['status'] == 'ok' and
        result['celery']['status'] == 'ok'
    )

    # Overall status
    if result['async_ready']:
        overall_status = 'healthy'
    elif result['database']['status'] == 'ok':
        overall_status = 'degraded'  # Sync mode still works
    else:
        overall_status = 'unhealthy'

    result['status'] = overall_status
    result['sync_available'] = result['database']['status'] == 'ok'

    # Add hint for degraded mode
    if overall_status == 'degraded':
        result['hint'] = 'Async processing unavailable. Sync mode will be used (slower but functional).'

    return JsonResponse(result)
