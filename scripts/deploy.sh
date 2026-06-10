#!/bin/bash
set -e

DEPLOY_DIR="/home/magical-girls"
GITHUB_RAW="https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main"

echo "=== Magical Girls Witch Trial 部署脚本 ==="

# 1. 创建目录
echo "[1/4] 创建目录..."
mkdir -p $DEPLOY_DIR/{data,backups}
cd $DEPLOY_DIR

# 2. 下载 docker-compose.yml
echo "[2/4] 下载 docker-compose.yml..."
curl -sSf -o docker-compose.yml "$GITHUB_RAW/docker-compose.yml"

# 3. 检查 .env
if [ ! -f .env ] || ! grep -q "ADMIN_PASSWORD" .env; then
  echo "[3/4] 请先设置管理员密码:"
  echo "    echo 'ADMIN_PASSWORD=你的密码' > /home/magical-girls/.env"
  echo ""
  echo "设置完成后重新运行此脚本，或继续手动部署:"
  echo "    docker compose pull && docker compose up -d"
  exit 1
fi
echo "[3/4] .env 已存在"

# 4. 配置镜像加速（仅首次）
if [ ! -f /etc/docker/daemon.json ] || ! grep -q "registry-mirrors" /etc/docker/daemon.json; then
  echo "[4/4] 请配置阿里云镜像加速地址:"
  echo "    sudo tee /etc/docker/daemon.json <<< '{\"registry-mirrors\":[\"https://xxx.mirror.aliyuncs.com\"]}'"
  echo "    sudo systemctl restart docker"
  echo ""
  echo "配置完成后运行: docker compose pull && docker compose up -d"
  exit 0
fi
echo "[4/4] 镜像加速已配置"

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
