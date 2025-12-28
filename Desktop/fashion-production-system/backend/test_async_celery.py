"""
Celery 真异步验证脚本 - Priority 0
====================================

执行前提：
1. Redis 已启动（docker/WSL/Memurai）
2. Celery Worker 已启动（另一个终端）
3. Django Server 已启动（另一个终端）

使用方法：
python test_async_celery.py
"""

import os
import sys
import time
import requests
import json
from datetime import datetime

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
import django
django.setup()

from django.conf import settings

# API Base URL
API_BASE = "http://localhost:8000/api/v2"

# ANSI Colors for output
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
RESET = '\033[0m'

def log(msg, level="INFO"):
    """Print colored log messages"""
    colors = {
        "OK": GREEN,
        "WARN": YELLOW,
        "ERROR": RED,
        "INFO": BLUE
    }
    color = colors.get(level, RESET)
    print(f"{color}[{level}]{RESET} {msg}")


def check_redis():
    """Step 0: Check Redis connection"""
    log("Checking Redis connection...", "INFO")
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        result = r.ping()
        if result:
            log("Redis PING -> PONG", "OK")
            return True
    except Exception as e:
        log(f"Redis not available: {e}", "ERROR")
        log("Please start Redis first (docker/WSL/Memurai)", "ERROR")
        return False


def check_django_broker():
    """Step 1: Check Django broker URL"""
    log("Checking Django CELERY_BROKER_URL...", "INFO")
    broker = settings.CELERY_BROKER_URL
    backend = settings.CELERY_RESULT_BACKEND

    log(f"BROKER:  {broker}", "INFO")
    log(f"BACKEND: {backend}", "INFO")

    if "redis://localhost:6379" in broker:
        log("Django broker URL is correct", "OK")
        return True
    else:
        log("Broker URL mismatch!", "ERROR")
        return False


def test_workflow():
    """Step 2-9: Execute full async workflow"""

    # Step 2: bulk-create
    log("\n=== Step 2: POST /styles/bulk-create ===", "INFO")

    payload = {
        "items": [{
            "style_number": "ASYNC-TEST-001",
            "style_name": "Async Test Style",
            "season": "SS25",
            "revision_label": "Rev A"
        }]
    }

    resp = requests.post(f"{API_BASE}/styles/bulk-create/", json=payload)

    if resp.status_code != 201:
        log(f"bulk-create failed: {resp.status_code}", "ERROR")
        log(resp.text, "ERROR")
        return False

    data = resp.json()
    revision_id = data['data']['created'][0]['revision_id']
    log(f"Created revision: {revision_id}", "OK")

    # Step 3: upload-init
    log("\n=== Step 3: POST /documents/upload-init ===", "INFO")

    payload = {
        "doc_type": "techpack",
        "file_kind": "pdf",
        "filename": "async_test_techpack.pdf",
        "content_type": "application/pdf",
        "file_size": 1024
    }

    resp = requests.post(f"{API_BASE}/documents/upload-init/", json=payload)

    if resp.status_code != 201:
        log(f"upload-init failed: {resp.status_code}", "ERROR")
        log(resp.text, "ERROR")
        return False

    data = resp.json()
    document_id = data['data']['document_id']
    log(f"Created document: {document_id}", "OK")

    # Step 4: complete
    log("\n=== Step 4: POST /documents/{id}/complete ===", "INFO")

    payload = {
        "file_hash": "async_test_hash_123",
        "file_size": 1024
    }

    resp = requests.post(f"{API_BASE}/documents/{document_id}/complete/", json=payload)

    if resp.status_code != 200:
        log(f"complete failed: {resp.status_code}", "ERROR")
        log(resp.text, "ERROR")
        return False

    log("Document marked as uploaded", "OK")

    # Step 5: attach
    log("\n=== Step 5: POST /documents/{id}/attach ===", "INFO")

    payload = {
        "revision_id": revision_id
    }

    resp = requests.post(f"{API_BASE}/documents/{document_id}/attach/", json=payload)

    if resp.status_code != 200:
        log(f"attach failed: {resp.status_code}", "ERROR")
        log(resp.text, "ERROR")
        return False

    log(f"Document attached to revision {revision_id}", "OK")

    # Step 6: parse (CRITICAL - must return 202!)
    log("\n=== Step 6: POST /revisions/{id}/parse (ASYNC!) ===", "INFO")

    payload = {
        "targets": ["bom", "measurement", "construction"]
    }

    resp = requests.post(f"{API_BASE}/revisions/{revision_id}/parse/", json=payload)

    if resp.status_code != 202:
        log(f"parse FAILED - Expected 202, got {resp.status_code}", "ERROR")
        log("This means the task is NOT async!", "ERROR")
        log(resp.text, "ERROR")
        return False

    data = resp.json()
    extraction_run_id = data['data']['extraction_run_id']
    job_id = data['data']['job_id']

    log(f"Parse triggered (ASYNC 202 OK)", "OK")
    log(f"ExtractionRun ID: {extraction_run_id}", "INFO")
    log(f"Job ID: {job_id}", "INFO")

    # Step 7: Poll extraction-runs status
    log("\n=== Step 7: Polling ExtractionRun status ===", "INFO")
    log("NOW CHECK CELERY WORKER LOG - You should see:", "WARN")
    log("  Task apps.parsing.tasks.parse_techpack_task[...] received", "WARN")
    log("  Task apps.parsing.tasks.parse_techpack_task[...] succeeded", "WARN")

    max_wait = 30  # 30 seconds
    poll_interval = 1

    for i in range(max_wait):
        time.sleep(poll_interval)

        resp = requests.get(f"{API_BASE}/extraction-runs/{extraction_run_id}/")

        if resp.status_code != 200:
            log(f"Failed to get extraction-run: {resp.status_code}", "ERROR")
            return False

        data = resp.json()
        status = data['data']['status']

        log(f"[{i+1}s] Status: {status}", "INFO")

        if status == "completed":
            log("Task completed successfully!", "OK")
            break
        elif status == "failed":
            log(f"Task failed: {data['data'].get('error')}", "ERROR")
            return False
        elif i == max_wait - 1:
            log("Task stuck in pending - check worker logs!", "ERROR")
            return False

    # Step 8: Check draft data
    log("\n=== Step 8: GET /revisions/{id}/draft ===", "INFO")

    resp = requests.get(f"{API_BASE}/revisions/{revision_id}/draft/")

    if resp.status_code != 200:
        log(f"draft failed: {resp.status_code}", "ERROR")
        log(resp.text, "ERROR")
        return False

    data = resp.json()
    draft = data['data']

    bom_count = len(draft.get('bom', {}).get('items', []))
    meas_count = len(draft.get('measurement', {}).get('points', []))
    const_count = len(draft.get('construction', {}).get('steps', []))
    issue_count = len(draft.get('issues', []))

    log(f"BOM items: {bom_count}", "INFO")
    log(f"Measurement points: {meas_count}", "INFO")
    log(f"Construction steps: {const_count}", "INFO")
    log(f"Issues: {issue_count}", "INFO")

    if bom_count > 0 and meas_count > 0 and const_count > 0:
        log("Draft data exists!", "OK")
    else:
        log("Draft data is EMPTY - task didn't write to DB!", "ERROR")
        return False

    # Final summary
    log("\n" + "="*60, "INFO")
    log("PRIORITY 0 VERIFICATION COMPLETE!", "OK")
    log("="*60, "INFO")
    log("All 7/7 checkpoints passed:", "OK")
    log("  [OK] Redis connected", "OK")
    log("  [OK] Django broker URL correct", "OK")
    log("  [OK] Celery worker running (check terminal)", "OK")
    log("  [OK] POST /parse returned 202 (ASYNC)", "OK")
    log("  [OK] Worker received + succeeded (check terminal)", "OK")
    log("  [OK] ExtractionRun status = completed", "OK")
    log("  [OK] Draft data written to DB", "OK")
    log("\nYou can now proceed to Priority 1: Review UI!", "OK")

    return True


def main():
    """Main test runner"""
    print("\n" + "="*60)
    print("CELERY ASYNC VERIFICATION - Priority 0")
    print("="*60 + "\n")

    # Pre-flight checks
    if not check_redis():
        log("\nPlease start Redis and try again:", "ERROR")
        log("  Docker:  docker run -d --name fashion-plm-redis -p 6379:6379 redis:7-alpine", "INFO")
        log("  WSL:     sudo service redis-server start", "INFO")
        log("  Memurai: Start from Windows Services", "INFO")
        sys.exit(1)

    if not check_django_broker():
        log("\nCheck backend/.env CELERY_BROKER_URL setting", "ERROR")
        sys.exit(1)

    log("\nPre-flight checks passed!", "OK")
    log("\nMAKE SURE YOU HAVE 3 TERMINALS RUNNING:", "WARN")
    log("  Terminal 1: Redis (docker/WSL/Memurai)", "WARN")
    log("  Terminal 2: celery -A config worker -l info --pool=solo -Q celery", "WARN")
    log("  Terminal 3: python manage.py runserver", "WARN")

    input("\nPress ENTER when all 3 services are ready...")

    # Run workflow test
    success = test_workflow()

    if success:
        sys.exit(0)
    else:
        log("\nVerification FAILED - check errors above", "ERROR")
        sys.exit(1)


if __name__ == "__main__":
    main()
