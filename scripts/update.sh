#!/bin/bash
set -e

DEPLOY_DIR="/home/magical-girls"
GITHUB_RAW="https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main"
GITHUB_PROXY="https://ghfast.top/https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main"

mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

echo "=== 更新 Magical Girls Witch Trial ==="

# 1. 检查 .env
if [ ! -f .env ] || ! grep -q "^ADMIN_PASSWORD=.\+" .env; then
  echo ""
  read -sp "请设置管理员密码: " password
  echo ""
  if [ -z "$password" ]; then
    echo "错误: 密码不能为空"
    exit 1
  fi
  {
    echo "ADMIN_PASSWORD=$password"
    grep -v "^ADMIN_PASSWORD=" .env 2>/dev/null || true
  } > .env.tmp && mv .env.tmp .env
  echo ".env 已保存"
else
  echo ".env 已存在，跳过"
fi

# 2. 备份并更新 docker-compose.yml
if [ -f docker-compose.yml ]; then
  cp docker-compose.yml "docker-compose.yml.backup.$(date +%Y%m%d%H%M%S)"
fi

echo "下载最新 docker-compose.yml..."
if ! curl -sSf --connect-timeout 10 -o docker-compose.yml "$GITHUB_RAW/docker-compose.yml" 2>/dev/null; then
  echo "  直连失败，尝试镜像加速..."
  curl -sSf --connect-timeout 10 -o docker-compose.yml "$GITHUB_PROXY/docker-compose.yml"
fi

# 3. 拉取镜像并重启
echo "拉取镜像..."
docker compose pull

echo "重启服务..."
docker compose up -d

echo ""
echo "✅ 更新完成"
docker compose ps
