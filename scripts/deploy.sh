#!/bin/bash
set -e

DEPLOY_DIR="/home/magical-girls"
GITEE_RAW="https://gitee.com/XYY526/magical-girls-witch-trial/raw/main"

echo "=== Magical Girls Witch Trial 部署脚本 ==="

# 1. 创建目录
echo "[1/5] 创建目录..."
mkdir -p $DEPLOY_DIR/{data,backups}
cd $DEPLOY_DIR

# 2. 下载 docker-compose.yml
echo "[2/5] 下载 docker-compose.yml..."
curl -sSf -o docker-compose.yml "$GITEE_RAW/docker-compose.yml"

# 3. 检查 .env
if [ ! -f .env ] || ! grep -q "ADMIN_PASSWORD" .env; then
  echo "[3/5] 请输入 ADMIN_PASSWORD:"
  read -s ADMIN_PW
  echo "ADMIN_PASSWORD=$ADMIN_PW" > .env
  echo "  .env 已创建"
else
  echo "[3/5] .env 已存在，跳过"
fi

# 4. 配置镜像加速（仅首次）
if [ ! -f /etc/docker/daemon.json ] || ! grep -q "registry-mirrors" /etc/docker/daemon.json; then
  echo "[4/5] 请输入阿里云镜像加速地址（如 https://xxx.mirror.aliyuncs.com），留空跳过:"
  read MIRROR_URL
  if [ -n "$MIRROR_URL" ]; then
    sudo tee /etc/docker/daemon.json > /dev/null << EOF
{
  "registry-mirrors": ["$MIRROR_URL"]
}
EOF
    sudo systemctl restart docker
    echo "  镜像加速已配置"
  fi
else
  echo "[4/5] 镜像加速已配置，跳过"
fi

# 5. 拉取并启动
echo "[5/5] 拉取镜像并启动..."
docker compose pull
docker compose up -d

echo ""
echo "=== 部署完成 ==="
echo "访问: http://$(hostname -I | awk '{print $1}'):8091"
echo "数据: $DEPLOY_DIR/data/"
echo "备份: $DEPLOY_DIR/backups/"
echo ""
echo "日常更新: cd $DEPLOY_DIR && docker compose pull && docker compose up -d"