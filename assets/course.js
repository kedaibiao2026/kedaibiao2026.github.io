/* 课程详情页：Markdown 文章 + 内嵌 B站视频 + 资料下载，桌面双栏同屏 */
async function initCourse(){
  const params=new URLSearchParams(location.search);
  const id=params.get('id');
  try{
    if(!DATA) await loadData();
    document.body.insertAdjacentHTML('afterbegin',navHTML('videos'));
    const v=(DATA.videos||[]).find(x=>x.id===id);
    if(!v) throw new Error('课程不存在：'+(id||'未指定'));
    await renderCourse(v);
  }catch(e){
    document.getElementById('app').innerHTML=`<div class="wrap section" style="padding-top:40px"><div class="empty">课程加载失败：${esc(e.message)}<br><a href="videos.html">← 返回课程列表</a></div></div>`;
  }
  if(DATA) document.body.insertAdjacentHTML('beforeend',footerHTML()+playerModalHTML());
}

async function renderCourse(v){
  // 读 markdown 文章
  let md='';
  if(v.article){
    try{ const r=await fetch(v.article,{cache:'no-store'}); if(r.ok) md=await r.text(); }catch(e){}
  }
  if(!md) md=`# ${v.title}\n\n${v.desc||''}\n\n{{VIDEO:${v.id}}}\n\n课程正文整理中。`;

  // marked 渲染
  const html = (window.marked ? marked.parse(md) : `<h1>${esc(v.title)}</h1><p>${esc(md)}</p>`);
  const body = decorate(html, v);

  const playable = v.status==='live' && v.bvid;
  const resources = (DATA.resources||[]).filter(r=>r.videoId===v.id);
  const resList = resources.map(r=>{
    const ok=r.status==='live'&&r.link;
    return `<a class="res-btn ${ok?'':'off'}" ${ok?`href="${esc(r.link)}" target="_blank" rel="noopener"`:'disabled'}>
      <span class="res-ico">📦</span><span><b>${esc(r.title)}</b><small>${esc(r.desc||'')}</small></span>
      <span class="res-go">${ok?'领取 →':'待开放'}</span></a>`;
  }).join('');

  document.getElementById('app').innerHTML=`
    <div class="course-head">
      <div class="wrap">
        <a class="back" href="videos.html">← 返回课程</a>
        <div class="tags"><span class="tag">${esc(v.subject)}</span><span class="tag gold">${esc(v.grade)}</span>${v.chapter&&v.chapter!=='—'?`<span class="tag">${esc(v.chapter)}</span>`:''}</div>
        <h1>${esc(v.title)}</h1>
        <p class="lead">${esc(v.desc||'')}</p>
        <div class="meta">${v.duration?`⏱ ${esc(v.duration)} · `:''}${esc(v.date||'')} · ${esc((v.tags||[]).join(' / '))}</div>
      </div>
    </div>
    <div class="wrap course-layout">
      <article class="article" id="article">${body}</article>
      <aside class="course-side">
        <div class="side-box">
          <div class="side-title">▶ 观看视频</div>
          ${playable
            ? `<div class="video-slot" onclick="openPlayer('${esc(v.bvid)}','${esc(v.title).replace(/'/g,"\\'")}')">
                 <img src="${esc(v.cover)}" alt=""><span class="play-big">▶</span><span class="play-hint">点击播放 · B站外链</span>
               </div>`
            : `<div class="video-slot off"><img src="${esc(v.cover)}" alt=""><span class="play-hint">${esc(v.statusNote||'视频即将上线')}</span></div>`}
        </div>
        ${resList?`<div class="side-box"><div class="side-title">📦 配套资料</div>${resList}<p class="res-note">资料通过迅雷云盘免费领取</p></div>`:''}
        <div class="side-box tips-box">
          <div class="side-title">💡 学习建议</div>
          <p>先读文章掌握框架 → 再看视频听讲解 → 最后做配套练习巩固。</p>
        </div>
      </aside>
    </div>`;
}

/* 把文章里的占位符替换成交互组件 */
function decorate(html, v){
  // {{VIDEO:id}} → 正文内联视频入口
  html=html.replace(/\{\{VIDEO:([^}]+)\}\}/g,(m,id)=>{
    const target=(DATA.videos||[]).find(x=>x.id===id.trim())||v;
    if(target.status==='live'&&target.bvid){
      return `<div class="inline-video" onclick="openPlayer('${esc(target.bvid)}','${esc(target.title).replace(/'/g,"\\'")}')">
        <span class="iv-play">▶</span><span>在文章中观看视频：${esc(target.title)}</span></div>`;
    }
    return `<div class="inline-video off">📹 视频《${esc(target.title)}》即将上线</div>`;
  });
  // {{RESOURCE:id}} → 正文内联资料下载
  html=html.replace(/\{\{RESOURCE:([^}]+)\}\}/g,(m,id)=>{
    const r=(DATA.resources||[]).find(x=>x.id===id.trim());
    if(!r) return '';
    const ok=r.status==='live'&&r.link;
    return `<div class="inline-res ${ok?'':'off'}">
      <div><b>📦 ${esc(r.title)}</b><p>${esc(r.desc||'')} · 网盘免费领取</p></div>
      ${ok?`<a class="btn" href="${esc(r.link)}" target="_blank" rel="noopener">立即领取</a>`:`<span class="btn ghost">待开放</span>`}
    </div>`;
  });
  // {{TIP:...}} → 提示框
  html=html.replace(/\{\{TIP:([^}]+)\}\}/g,(m,t)=>`<div class="tip-box">💡 ${esc(t)}</div>`);
  return html;
}
