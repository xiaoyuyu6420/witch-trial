#!/bin/bash
set -e

DEPLOY_DIR="/home/magical-girls"
GITHUB_RAW="https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main"
# 国内镜像加速
GITHUB_PROXY="https://ghfast.top/https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main"

echo "=== Magical Girls Witch Trial 部署脚本 ==="

# 1. 创建目录
echo "[1/3] 创建目录..."
mkdir -p $DEPLOY_DIR/{data,backups}
cd $DEPLOY_DIR

# 2. 下载 docker-compose.yml
echo "[2/3] 下载 docker-compose.yml..."
if ! curl -sSf --connect-timeout 10 -o docker-compose.yml "$GITHUB_RAW/docker-compose.yml" 2>/dev/null; then
  echo "  直连失败，尝试镜像加速..."
  curl -sSf --connect-timeout 10 -o docker-compose.yml "$GITHUB_PROXY/docker-compose.yml"
fi

# 3. 检查 .env
if [ ! -f .env ] || ! grep -q "ADMIN_PASSWORD" .env; then
  echo "[3/3] 请先设置管理员密码:"
  echo "    echo 'ADMIN_PASSWORD=你的密码' > /home/magical-girls/.env"
  echo ""
  echo "设置完成后重新运行此脚本，或继续手动部署:"
  echo "    docker compose pull && docker compose up -d"
  exit 1
fi
echo "[3/3] .env 已存在"

# 拉取并启动
echo "拉取镜像并启动..."
docker compose pull
docker compose up -d

echo ""
echo "=== 部署完成 ==="
echo "访问: http://$(hostname -I | awk '{print $1}'):8091"
echo "数据: $DEPLOY_DIR/data/"
echo "备份: $DEPLOY_DIR/backups/"
echo ""
echo "日常更新: cd $DEPLOY_DIR && docker compose pull && docker compose up -d"