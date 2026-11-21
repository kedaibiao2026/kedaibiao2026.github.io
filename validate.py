#!/usr/bin/env python3
"""content.json 数据契约校验。deploy.sh 部署前自动跑，防止写错数据。
v3（2026-11-21）：新增 navigation / aboutLayers / learningSteps / order / SEO 字段校验。"""
import json, sys, re, os

def check():
    with open('content.json', encoding='utf-8') as f:
        d = json.load(f)
    errs, warns = [], []
    required_top = ['site','navigation','collections','learningSteps','aboutLayers','videos','resources','mirrors']
    for k in required_top:
        if k not in d: errs.append(f'缺少顶层字段: {k}')

    # site 必填
    site = d.get('site', {})
    for k in ['name','logo','slogan','intro','description','keywords']:
        if not site.get(k): errs.append(f'site.{k} 为空')
    if site.get('logo') and not os.path.exists(site['logo']):
        errs.append(f'site.logo 文件不存在: {site["logo"]}')

    # navigation
    for l in d.get('navigation', []):
        for k in ['label','href','key']:
            if not l.get(k): errs.append(f'navigation 条目缺 {k}: {l}')

    # learningSteps
    if len(d.get('learningSteps', [])) < 2:
        warns.append('learningSteps 少于 2 步')

    # aboutLayers
    al = d.get('aboutLayers', {})
    for k in ['forParents','forStudents']:
        if not al.get(k, {}).get('points'): errs.append(f'aboutLayers.{k}.points 为空')

    # collections
    for c in d.get('collections', []):
        if not c.get('id') or not c.get('name'): errs.append('collection 缺 id/name')

    # videos：id 唯一 + 字段校验
    seen = set()
    for v in d.get('videos', []):
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
        art=v.get('article','')
        if art:
            if not os.path.exists(art): errs.append(f'视频 {vid} 文章文件不存在: {art}')
        else:
            warns.append(f'视频 {vid} 无 article 字段（课程详情页将用简版）')
        cov=v.get('cover','')
        if cov and not os.path.exists(cov):
            errs.append(f'视频 {vid} 封面文件不存在: {cov}')

    # resources：关联 video 是否存在
    vids = {v.get('id') for v in d.get('videos',[])}
    rseen = set()
    for r in d.get('resources',[]):
        if not r.get('id'): errs.append('资料缺 id')
        if r.get('id') in rseen: errs.append(f'资料 id 重复: {r.get("id")}')
        rseen.add(r.get('id'))
        if r.get('status')=='live' and not r.get('link'):
            errs.append(f'资料 {r.get("id")} status=live 但无 link')
        if r.get('videoId') and r['videoId'] not in vids:
            warns.append(f'资料 {r.get("id")} 关联视频 {r["videoId"]} 不存在')

    # mirrors
    for m in d.get('mirrors',[]):
        if not m.get('url'): errs.append(f'镜像 {m.get("name")} 缺 url')
        if not m.get('tag'): warns.append(f'镜像 {m.get("name")} 无 tag')

    return errs, warns

if __name__ == '__main__':
    errs, warns = check()
    for w in warns: print('⚠ 警告:', w)
    for e in errs: print('✗ 错误:', e)
    if errs:
        print(f'\n校验失败：{len(errs)} 个错误，请修复后再部署')
        sys.exit(1)
    print(f'✓ 校验通过（{len(warns)} 个警告，可忽略）')
