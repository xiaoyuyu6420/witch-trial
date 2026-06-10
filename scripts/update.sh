#!/bin/bash
set -e

DEPLOY_DIR="/home/magical-girls"
GITHUB_RAW="https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main"
GITHUB_PROXY="https://ghfast.top/https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main"

cd "$DEPLOY_DIR"

echo "=== 更新 Magical Girls Witch Trial ==="

# 1. 备份并更新 docker-compose.yml
if [ -f docker-compose.yml ]; then
  cp docker-compose.yml "docker-compose.yml.backup.$(date +%Y%m%d%H%M%S)"
fi

echo "下载最新 docker-compose.yml..."
if ! curl -sSf --connect-timeout 10 -o docker-compose.yml "$GITHUB_RAW/docker-compose.yml" 2>/dev/null; then
  echo "  直连失败，尝试镜像加速..."
  curl -sSf --connect-timeout 10 -o docker-compose.yml "$GITHUB_PROXY/docker-compose.yml"
fi

# 2. 拉取镜像并重启
echo "拉取镜像..."
docker compose pull

echo "重启服务..."
docker compose up -d

echo ""
echo "✅ 更新完成"
docker compose ps
