#!/bin/bash
set -e

DEPLOY_DIR="/home/magical-girls"
GITHUB_RAW="https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main"
# 国内镜像加速
GITHUB_PROXY="https://ghfast.top/https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main"

VERSION_FILE="$DEPLOY_DIR/.current-version"
HEALTH_URL="http://localhost:8091/api/count"
MAX_WAIT=60

# 回滚函数
rollback() {
  echo ""
  echo "=== 回滚到上一个版本 ==="
  if [ ! -f "$VERSION_FILE" ]; then
    echo "错误: 没有版本记录，无法回滚"
    exit 1
  fi

  current=$(cat "$VERSION_FILE")
  previous=$(grep -v "^$current$" "$VERSION_FILE.history" 2>/dev/null | tail -1)

  if [ -z "$previous" ]; then
    echo "错误: 没有找到上一个版本"
    exit 1
  fi

  echo "当前版本: $current"
  echo "回滚版本: $previous"
  read -p "确定回滚吗？(y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "已取消"
    exit 0
  fi

  cd "$DEPLOY_DIR"
  sed -i '' "s|image: .*|image: xiaoyuyu123/magical-girls-witch-trial:$previous|" docker-compose.yml
  docker compose pull
  docker compose up -d
  echo "$previous" > "$VERSION_FILE"
  echo ""
  echo "✅ 回滚完成，版本: $previous"
  exit 0
}

# 检查是否要回滚
if [ "$1" = "--rollback" ] || [ "$1" = "-r" ]; then
  rollback
fi

echo "=== Magical Girls Witch Trial 部署脚本 ==="
echo ""
echo "提示: 使用 --rollback 可回滚到上一个版本"
echo ""

# 1. 创建目录
echo "[1/4] 创建目录..."
mkdir -p $DEPLOY_DIR/{data,backups}
cd $DEPLOY_DIR

# 2. 备份并下载 docker-compose.yml
echo "[2/4] 下载 docker-compose.yml..."
if [ -f docker-compose.yml ]; then
  backup_name="docker-compose.yml.backup.$(date +%Y%m%d%H%M%S)"
  cp docker-compose.yml "$backup_name"
  echo "  已备份: $backup_name"
fi
if ! curl -sSf --connect-timeout 10 -o docker-compose.yml "$GITHUB_RAW/docker-compose.yml" 2>/dev/null; then
  echo "  直连失败，尝试镜像加速..."
  curl -sSf --connect-timeout 10 -o docker-compose.yml "$GITHUB_PROXY/docker-compose.yml"
fi

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

# 记录当前版本
CURRENT_VERSION="latest"
if [ -f "$VERSION_FILE" ]; then
  PREVIOUS_VERSION=$(cat "$VERSION_FILE")
  # 保存到历史记录
  echo "$PREVIOUS_VERSION" >> "$VERSION_FILE.history"
fi
echo "$CURRENT_VERSION" > "$VERSION_FILE"

# 4. 拉取并启动
echo "[4/4] 拉取镜像并启动..."
docker compose pull
docker compose up -d

# 5. 等待健康检查
echo ""
echo "等待服务启动..."
waited=0
while [ $waited -lt $MAX_WAIT ]; do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo ""
    echo "=== ✅ 部署成功 ==="
    echo "访问: http://$(hostname -I | awk '{print $1}'):8091"
    echo "数据: $DEPLOY_DIR/data/"
    echo "备份: $DEPLOY_DIR/backups/"
    echo "版本: $CURRENT_VERSION"
    echo ""
    echo "回滚: cd $DEPLOY_DIR && ./scripts/deploy.sh --rollback"
    echo "恢复数据库: ./scripts/restore-backup.sh"
    echo "日常更新: curl -sSL https://raw.githubusercontent.com/xiaoyuyu6420/magical-girls-witch-trial/main/scripts/update.sh | bash"
    exit 0
  fi
  sleep 2
  waited=$((waited + 2))
  echo -n "."
done

echo ""
echo "=== ⚠️  部署完成但服务未就绪 ==="
echo "请检查日志:"
echo "    cd $DEPLOY_DIR && docker compose logs magical-girls-witch-trial"
echo ""
echo "如果需要回滚:"
echo "    cd $DEPLOY_DIR && ./scripts/deploy.sh --rollback"