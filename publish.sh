#!/usr/bin/env bash
# 课代表官网 · 半自动发布脚本（L2）
# 用法：bash publish.sh <视频ID> <标题> <bvid> <学段> <学科> <章节> "知识点1,知识点2" [封面路径] [简介]
# 示例：bash publish.sh MATH-J-002 绝对值 BV1xx411c7mD 初中 数学 七年级上 "绝对值,数轴" /path/cover.png "讲清绝对值的几何意义"
# 作用：写入 content.json（status=live）→ 封面传图床拿直链（若给封面）→ 跑 deploy.sh 双站部署
set -euo pipefail
cd "$(dirname "$0")"

ID="${1:?用法见脚本头部}"; TITLE="${2:?}"; BVID="${3:?}"; GRADE="${4:-初中}"; SUBJECT="${5:-数学}"
CHAPTER="${6:-—}"; TAGS="${7:-}"; COVER_SRC="${8:-}"; DESC="${9:-}"

echo "▶ 发布：$ID · $TITLE"
python3 - "$ID" "$TITLE" "$BVID" "$GRADE" "$SUBJECT" "$CHAPTER" "$TAGS" "$DESC" <<'PYEOF'
import json,sys,datetime
id,title,bvid,grade,subject,chapter,tags,desc=sys.argv[1:9]
d=json.load(open('content.json',encoding='utf-8'))
vids=d['videos']
found=None
for v in vids:
    if v['id']==id: found=v; break
if not found:
    found={'id':id,'player':'bilibili','backup_mp4':'','duration':'','cover':'assets/avatar.jpg'}
    vids.append(found)
found.update({'title':title,'bvid':bvid,'grade':grade,'subject':subject,'chapter':chapter,
  'desc':desc or found.get('desc',''),'date':datetime.date.today().isoformat(),
  'status':'live','tags':[t.strip() for t in tags.split(',') if t.strip()]})
found.pop('statusNote',None)
# 若无文章则生成骨架
art=found.get('article') or f'articles/{id}.md'
found['article']=art
import os
if not os.path.exists(art):
    os.makedirs('articles',exist_ok=True)
    related=[r['id'] for r in d.get('resources',[]) if r.get('videoId')==id]
    res_md='\n'.join(f'{{{{RESOURCE:{r}}}}}' for r in related) or '_（配套资料整理中）_'
    skeleton=f"# {title}\n\n> {desc or '这节课我们来学习'+title+'。'}\n\n{{{{VIDEO:{id}}}}}\n\n## 课程要点\n\n（在这里补充正文：概念讲解、例题分析、易错点…）\n\n## 课堂小结\n\n1. 要点一\n2. 要点二\n\n{res_md}\n\n---\n\n_配套资料通过迅雷云盘免费领取。_\n"
    open(art,'w',encoding='utf-8').write(skeleton)
    print(f'  ✓ 文章骨架已生成: {art}')
json.dump(d,open('content.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
print(f'  ✓ content.json 已写入（{len(vids)} 节课程）')
PYEOF

if [ -n "$COVER_SRC" ] && [ -f "$COVER_SRC" ]; then
  echo "▶ 上传封面到图床"
  SK=~/.openclaw/skills/tuchuang/scripts/tuchuang.py
  URL=$(python3 "$SK" upload "$COVER_SRC" --out txt 2>/dev/null | tail -1)
  if [ -n "$URL" ]; then
    python3 - "$ID" "$URL" <<'PYEOF'
import json,sys
id,url=sys.argv[1:3]
d=json.load(open('content.json',encoding='utf-8'))
for v in d['videos']:
    if v['id']==id: v['cover']=url
json.dump(d,open('content.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
print('  ✓ 封面直链已写入')
PYEOF
  else echo "  ⚠ 封面上传失败，沿用默认图"; fi
fi

echo "▶ 校验数据"
python3 validate.py || { echo "✗ 校验失败，未部署"; exit 1; }

echo "▶ 双站部署"
bash deploy.sh "发布 $ID $TITLE"
echo "✅ 发布完成：$TITLE 已上线到两个站点"
