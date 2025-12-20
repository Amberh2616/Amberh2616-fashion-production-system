#!/bin/bash
# Fashion PLM - Redis Startup Script
# Usage: ./start-redis.sh

REDIS_DIR="/c/Users/AMBER/Downloads/Redis"

echo "🚀 Starting Redis server..."
cd "$REDIS_DIR" && ./redis-server.exe redis.windows.conf &

# Wait for Redis to start
sleep 2

# Test connection
echo "🔍 Testing Redis connection..."
cd "$REDIS_DIR" && ./redis-cli.exe ping

if [ $? -eq 0 ]; then
  echo "✅ Redis is running on localhost:6379"
  echo ""
  echo "To use redis-cli:"
  echo "  cd $REDIS_DIR && ./redis-cli.exe"
  echo ""
  echo "To check status:"
  echo "  cd $REDIS_DIR && ./redis-cli.exe ping"
  echo ""
  echo "To stop Redis:"
  echo "  cd $REDIS_DIR && ./redis-cli.exe shutdown"
else
  echo "❌ Redis failed to start"
  exit 1
fi
