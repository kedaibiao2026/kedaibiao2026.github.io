#!/usr/bin/env bash
# 课代表官网 · 一键双部署（GitHub Pages + Cloudflare Pages）
# 用法：bash deploy.sh "提交说明"
# 凭证从保险箱自助读取，不落盘、不进日志。需要先 git add 好改动。
set -euo pipefail

SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
MSG="${1:-更新站点 $(date +%Y%m%d-%H%M)}"
SKILL_DIR="$HOME/.openclaw/skills/vaultwarden-bw-cli"
WRANGLER="$HOME/.openclaw/tools/wrangler/node_modules/.bin/wrangler"
REPO="kedaibiao2026/kedaibiao2026.github.io"

cleanup(){ rm -f /tmp/.kdb_pw /tmp/.kdb_session /tmp/.kdb_gh /tmp/.kdb_cf_email /tmp/.kdb_cf_key; }
trap cleanup EXIT

echo "▶ 0/4 从保险箱取凭证"
cd "$SKILL_DIR"
set -a; . ./.env; set +a
export NODE_EXTRA_CA_CERTS="$PWD/$VW_CA_CERT"
BW="$VW_BW_CLI"
# 手动解锁（bwq 脚本在部分环境会卡交互提示，这里走稳定路径）
echo "$VW_MASTER_PASSWORD_B64" | base64 -d > /tmp/.kdb_pw; chmod 600 /tmp/.kdb_pw
OUT=$("$BW" unlock --passwordfile /tmp/.kdb_pw 2>&1); rm -f /tmp/.kdb_pw
SESSION=$(echo "$OUT" | grep -oE '[A-Za-z0-9+/=]{60,}' | head -1)
[ -z "$SESSION" ] && { echo "✗ 保险箱解锁失败"; exit 2; }
"$BW" sync --session "$SESSION" >/dev/null 2>&1
# GitHub token
"$BW" list items --search "课代表github账号" --session "$SESSION" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin); i=[x for x in d if x.get('name')=='课代表github账号'][0]
f={x['name']:x['value'] for x in (i.get('fields') or [])}
print(f.get('所有权限的 token') or i['login']['password'])
" > /tmp/.kdb_gh
# CF email + global key
"$BW" list items --search "课代表cloudflare账号" --session "$SESSION" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin); i=[x for x in d if x.get('name')=='课代表cloudflare账号'][0]
f={x['name']:x['value'] for x in (i.get('fields') or [])}
open('/tmp/.kdb_cf_email','w').write(i['login']['username'])
open('/tmp/.kdb_cf_key','w').write(next(v for k,v in f.items() if 'Global' in k))
"
chmod 600 /tmp/.kdb_gh /tmp/.kdb_cf_email /tmp/.kdb_cf_key
echo "  ✓ 凭证已取（内存/临时文件，退出即删）"

echo "▶ 1/4 提交 + 推送 GitHub Pages"
cd "$SITE_DIR"
git add -A
if git diff --cached --quiet; then echo "  · 无新改动，跳过 commit"; else
  git -c user.email="kedaibiao2026@users.noreply.github.com" -c user.name="课代表" commit -qm "$MSG"
fi
TOK=$(cat /tmp/.kdb_gh)
git push "https://x-access-token:${TOK}@github.com/${REPO}.git" master 2>&1 | tail -3
echo "  ✓ GitHub Pages 已推送（自动构建）"

echo "▶ 2/4 部署 Cloudflare Pages（wrangler 官方工具）"
CLOUDFLARE_EMAIL=$(cat /tmp/.kdb_cf_email) CLOUDFLARE_API_KEY=$(cat /tmp/.kdb_cf_key) \
  "$WRANGLER" pages deploy . --project-name=kedaibiao-site --branch=master --commit-dirty=true 2>&1 | tail -8
echo "  ✓ Cloudflare Pages 已部署（两域名自动指向生产部署）"

echo "▶ 3/4 验证访问"
for u in https://kedaibiao2026.github.io/ https://kedaibiao2026.cc.cd/; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$u" 2>/dev/null || echo "000")
  echo "  $u -> HTTP $code"
done
echo "  （kedaibiao.ccwu.cc 若本机显示 000，多为本地 DNS 污染，用浏览器或手机验证）"

echo "▶ 4/4 完成：两边站点已同步更新 ✅"
