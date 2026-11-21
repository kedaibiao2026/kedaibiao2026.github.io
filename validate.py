#!/usr/bin/env python3
"""content.json 数据契约校验。deploy.sh 部署前自动跑，防止写错数据。"""
import json, sys, re

def check():
    d = json.load(open('content.json', encoding='utf-8'))
    errs, warns = [], []
    required_top = ['site','collections','videos','resources','mirrors']
    for k in required_top:
        if k not in d: errs.append(f'缺少顶层字段: {k}')

    # site 必填
    for k in ['name','logo','slogan','intro']:
        if not d.get('site',{}).get(k): errs.append(f'site.{k} 为空')

    # id 唯一 + 字段校验
    seen = set()
    for v in d.get('videos',[]):
        vid = v.get('id','')
        if not vid: errs.append('视频缺 id')
        if vid in seen: errs.append(f'视频 id 重复: {vid}')
        seen.add(vid)
        for k in ['title','subject','grade','status']:
            if not v.get(k): errs.append(f'视频 {vid} 缺 {k}')
        if v.get('status') not in ('draft','local','uploaded','live'):
            errs.append(f'视频 {vid} status 非法: {v.get("status")}')
        if v.get('status') == 'live' and not v.get('bvid'):
            errs.append(f'视频 {vid} status=live 但无 bvid')
        if v.get('bvid') and not re.match(r'^BV[0-9A-Za-z]+$', v['bvid']):
            warns.append(f'视频 {vid} bvid 格式存疑: {v.get("bvid")}')
        if not isinstance(v.get('tags',[]), list): errs.append(f'视频 {vid} tags 非数组')

    # resource 关联 video 是否存在
    vids = {v.get('id') for v in d.get('videos',[])}
    for r in d.get('resources',[]):
        if not r.get('id'): errs.append('资料缺 id')
        if r.get('status')=='live' and not r.get('link'):
            errs.append(f'资料 {r.get("id")} status=live 但无 link')
        if r.get('videoId') and r['videoId'] not in vids:
            warns.append(f'资料 {r.get("id")} 关联视频 {r["videoId"]} 不存在')

    # mirrors
    for m in d.get('mirrors',[]):
        if not m.get('url'): errs.append(f'镜像 {m.get("name")} 缺 url')

    return errs, warns

if __name__ == '__main__':
    errs, warns = check()
    for w in warns: print('⚠ 警告:', w)
    for e in errs: print('✗ 错误:', e)
    if errs:
        print(f'\n校验失败：{len(errs)} 个错误，请修复后再部署')
        sys.exit(1)
    print(f'✓ 校验通过（{len(warns)} 个警告，可忽略）')
