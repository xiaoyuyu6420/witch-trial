#!/bin/bash
set -e

# 用法: ./scripts/restore-backup.sh [备份文件路径]
# 如果不指定路径，会列出可用备份供选择

BACKUP_DIR="/home/magical-girls/backups"
DB_PATH="/home/magical-girls/data/witch-trial.db"

echo "=== 数据库恢复工具 ==="
echo ""

# 检查备份目录
if [ ! -d "$BACKUP_DIR" ]; then
  echo "错误: 备份目录不存在: $BACKUP_DIR"
  exit 1
fi

# 列出可用备份
backups=($(ls -t "$BACKUP_DIR"/*.db.gz 2>/dev/null))

if [ ${#backups[@]} -eq 0 ]; then
  echo "错误: 没有找到备份文件"
  exit 1
fi

echo "可用备份:"
for i in "${!backups[@]}"; do
  backup_file="${backups[$i]}"
  backup_date=$(stat -c %y "$backup_file" 2>/dev/null || stat -f "%Sm" "$backup_file")
  backup_size=$(du -h "$backup_file" | cut -f1)
  echo "  [$i] $(basename "$backup_file") ($backup_size) - $backup_date"
done
echo ""

# 选择备份
if [ -n "$1" ]; then
  # 使用指定的备份文件
  selected_backup="$1"
  if [ ! -f "$selected_backup" ]; then
    echo "错误: 备份文件不存在: $selected_backup"
    exit 1
  fi
else
  # 让用户选择
  read -p "选择备份编号 (默认 0): " selection
  selection=${selection:-0}

  if [ "$selection" -ge "${#backups[@]}" ] || [ "$selection" -lt 0 ]; then
    echo "错误: 无效的选择"
    exit 1
  fi
  selected_backup="${backups[$selection]}"
fi

echo ""
echo "选择的备份: $(basename "$selected_backup")"
echo ""

# 确认操作
read -p "⚠️  这将覆盖当前数据库，确定继续吗？(y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "已取消"
  exit 0
fi

# 停止服务
echo ""
echo "停止服务..."
cd /home/magical-girls
docker compose stop magical-girls-witch-trial

# 备份当前数据库
if [ -f "$DB_PATH" ]; then
  current_backup="$DB_PATH.before-restore.$(date +%Y%m%d%H%M%S)"
  cp "$DB_PATH" "$current_backup"
  echo "已备份当前数据库: $(basename "$current_backup")"
fi

# 恢复数据库
echo "恢复数据库..."
gunzip -c "$selected_backup" > "$DB_PATH"
echo "数据库已恢复"

# 启动服务
echo "启动服务..."
docker compose start magical-girls-witch-trial

# 等待健康检查
echo "等待服务启动..."
sleep 10

# 验证服务
if curl -sf http://localhost:8091/api/count > /dev/null 2>&1; then
  echo ""
  echo "✅ 恢复成功！服务已正常运行"
else
  echo ""
  echo "⚠️  服务可能未正常启动，请检查日志:"
  echo "    docker compose logs magical-girls-witch-trial"
fi
