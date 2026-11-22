/* ============================================================
   课代表官网 app.js v3 — 数据驱动渲染，内容单一真源 content.json
   页面：home / videos / resources / about；课程详情见 course.js
   维护说明见 网站结构与维护手册.md
   ============================================================ */
let DATA = null;
let SEARCH_INDEX = [];

async function loadData(){
  const r = await fetch('content.json', {cache:'no-store'});
  if(!r.ok) throw new Error('content.json 加载失败');
  DATA = await r.json();
  buildSearchIndex();
  return DATA;
}

/* ---------- 搜索索引：videos + resources 展平为统一条目 ---------- */
function buildSearchIndex(){
  SEARCH_INDEX = [];
  (DATA.videos||[]).forEach(v=>{
    SEARCH_INDEX.push({
      type:'video', id:v.id, title:v.title, desc:v.desc||'',
      subject:v.subject||'', grade:v.grade||'', chapter:v.chapter||'',
      tags:(v.tags||[]).join(' '), date:v.date||'', status:v.status, ref:v
    });
  });
  (DATA.resources||[]).forEach(r=>{
    SEARCH_INDEX.push({
      type:'resource', id:r.id, title:r.title, desc:r.desc||'',
      subject:'资料', grade:'', chapter:'',
      tags:(r.tags||[]).join(' '), date:'', status:r.status, ref:r
    });
  });
}

function matchQuery(item, q){
  if(!q) return true;
  const hay = [item.title,item.desc,item.subject,item.grade,item.chapter,item.tags,item.id]
    .join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every(term=>hay.includes(term));
}

/* ---------- 公共 UI ---------- */
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function navHTML(active){
  const links=DATA.navigation||[
    ['index.html','首页','home'],['videos.html','课程','videos'],
    ['resources.html','资料','resources'],['about.html','关于','about']
  ];
  const navLinks = links.map(l=>Array.isArray(l)?l:[l.href,l.label,l.key]);
  return `<header><div class="wrap bar">
    <a class="brand" href="index.html" aria-label="课代表首页"><img src="${esc(DATA.site.logo)}" alt=""><span>课<b>代表</b></span></a>
    <nav aria-label="主导航">${navLinks.map(([h,t,k])=>`<a href="${h}" class="${active===k?'on':''}" ${active===k?'aria-current="page"':''}>${esc(t)}</a>`).join('')}</nav>
  </div></header>`;
}

function footerHTML(){
  return `<footer><div class="wrap">
    <p><strong style="color:var(--gold)">课代表</strong> · ${esc(DATA.site.slogan)}</p>
    <p style="margin-top:8px">${esc(DATA.site.updateNote||'')}</p>
    <p style="margin-top:6px">${esc(DATA.site.footerNote||'')}</p>
    <p style="margin-top:10px"><a href="about.html#mirrors">查看全部访问地址 →</a></p>
  </div></footer>`;
}

function toTopHTML(){
  return `<button class="to-top" id="toTop" aria-label="返回顶部" title="返回顶部">↑</button>`;
}

function statusBadge(v){
  if(v.status==='live') return '<span class="badge live">▶ 可播放</span>';
  if(v.status==='pending') return '<span class="badge pending">待配置</span>';
  return '<span class="badge local">即将上线</span>';
}

/* ---------- 视频卡片 ---------- */
function videoCard(v){
  const hasVideo = v.status==='live' && v.bvid;
  return `<a class="card lesson" href="course.html?id=${encodeURIComponent(v.id)}" aria-label="阅读课程：${esc(v.title)}">
    <div class="lesson-cover"><img class="cover" src="${esc(v.cover)}" alt="${esc(v.title)}封面" loading="lazy">
      <span class="cover-badges"><span class="cb cb-text">图文</span>${hasVideo?'<span class="cb cb-video">视频</span>':''}</span>
    </div>
    <div class="body">
      <div class="tags"><span class="tag">${esc(v.subject)}</span><span class="tag gold">${esc(v.grade)}</span>${statusBadge(v)}</div>
      <h3>${esc(v.title)}</h3>
      <p>${esc(v.desc||'')}</p>
      <div class="meta">${v.chapter&&v.chapter!=='—'?`📖 ${esc(v.chapter)} · `:''}${v.duration?`⏱ ${esc(v.duration)} · `:''}${esc(v.date||'')}</div>
      <span class="btn sm">阅读课程 →</span>
    </div>
  </a>`;
}

function resourceCard(r){
  const ok = r.status==='live' && r.link;
  const v = (DATA.videos||[]).find(x=>x.id===r.videoId);
  return `<article class="card">
    <div class="body">
      <div class="tags"><span class="tag">配套资料</span>${statusBadge(r)}</div>
      <h3>${esc(r.title)}</h3>
      <p>${esc(r.desc||'')}</p>
      <div class="meta">${r.fileType?`📦 ${esc(r.fileType)}`:''}${r.size?` · ${esc(r.size)}`:''}</div>
      ${v?`<div class="meta">关联课程：<a href="course.html?id=${encodeURIComponent(v.id)}">${esc(v.title)}</a></div>`:''}
      ${ok
        ? `<a class="btn sm" href="${esc(r.link)}" target="_blank" rel="noopener">获取资料</a>`
        : `<button class="btn sm ghost" disabled title="${esc(r.statusNote||'')}">即将开放</button>`}
    </div>
  </article>`;
}

/* ---------- 播放器弹窗 ---------- */
function openPlayer(bvid,title){
  document.getElementById('playerTitle').textContent=title;
  document.getElementById('playerFrame').src=`https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&high_quality=1&danmaku=0&autoplay=1`;
  document.getElementById('playerModal').classList.add('on');
  document.body.style.overflow='hidden';
}
function closePlayer(){
  document.getElementById('playerModal').classList.remove('on');
  document.getElementById('playerFrame').src='';
  document.body.style.overflow='';
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closePlayer(); });
window.openPlayer=openPlayer; window.closePlayer=closePlayer;
function playerModalHTML(){
  return `<div class="modal" id="playerModal" role="dialog" aria-modal="true" aria-label="视频播放" onclick="if(event.target===this)closePlayer()">
    <div class="modal-box"><div class="modal-head"><span id="playerTitle"></span><button onclick="closePlayer()" aria-label="关闭">×</button></div>
    <iframe id="playerFrame" class="player" allowfullscreen allow="autoplay; fullscreen"></iframe></div></div>`;
}

/* ---------- 搜索栏 + 筛选组件 ---------- */
function searchBarHTML(ph,q){
  return `<div class="searchbar"><span class="ico" aria-hidden="true">🔍</span><input id="q" type="search" placeholder="${esc(ph)}" value="${esc(q)}" autocomplete="off" aria-label="搜索"><button id="qclear" class="qclear" title="清除" aria-label="清除搜索">×</button></div>`;
}
function chipGroup(label,key,options,current){
  return `<div class="filter-row"><span class="flabel">${label}</span><div class="chips" data-key="${key}" role="group" aria-label="${label}">`+
    options.map(o=>`<button class="chip ${current===o?'on':''}" data-val="${esc(o)}" aria-pressed="${current===o}">${esc(o)}</button>`).join('')+`</div></div>`;
}

/* URL 参数读写 */
function getParams(){ return new URLSearchParams(location.search); }
function setParam(k,v){
  const p=getParams();
  if(v) p.set(k,v); else p.delete(k);
  history.replaceState(null,'',location.pathname+(p.toString()?'?'+p:''));
}

/* ---------- 首页 ---------- */
function renderHome(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('home'));
  const s=DATA.site, vids=DATA.videos||[], cols=[...(DATA.collections||[])].sort((a,b)=>(a.order||0)-(b.order||0));
  const live=vids.filter(v=>v.status==='live').length;
  const pts=new Set(); vids.forEach(v=>(v.tags||[]).forEach(t=>pts.add(t)));
  const recent=[...vids].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);
  // 已开课学科 = 有课程卡宣称的学科；其余学科标记为建设中占位
  const offeredSubjects=new Set(vids.map(v=>v.subject).filter(Boolean));
  // 统计条：起步阶段内容少先隐藏，site.showStats=true 时显示
  const statsHTML = s.showStats === true ? `
    <div class="wrap">
      <div class="stats">
        <div><b>${vids.length}</b><span>精品课程</span></div>
        <div><b>${pts.size}</b><span>知识点</span></div>
        <div><b>${cols.length}</b><span>学段专辑</span></div>
        <div><b>${live}</b><span>含视频讲解</span></div>
      </div>
    </div>` : '';
  const steps=DATA.learningSteps||[
    {no:1,title:'选知识点',desc:'按学段找到要学的那一课'},
    {no:2,title:'看图文 + 视频',desc:'3-5 分钟讲透，边看边学'},
    {no:3,title:'领资料练习',desc:'网盘免费领取，巩固所学'}
  ];
  const stepsHTML=steps.map((st,i)=>`${i?'<div class="step-arrow" aria-hidden="true">→</div>':''}
    <div class="step"><span class="step-no">${st.no}</span><div><h4>${esc(st.title)}</h4><p>${esc(st.desc)}</p></div></div>`).join('');
  document.getElementById('app').innerHTML=`
    <section class="hero">
      <img class="hero-mascot" src="${esc(s.logo)}" alt="课代表头像">
      <h1>课<b>代表</b>来咯!</h1>
      <div class="slogan">${esc(s.slogan)}</div>
      <p>${esc(s.intro)}</p>
      <div class="actions"><a class="btn" href="videos.html">开始学习</a><a class="btn gold" href="resources.html">找资料</a></div>
    </section>
    ${statsHTML}
    <section class="wrap section reveal"><h2>怎么学</h2>
      <div class="steps">${stepsHTML}</div>
    </section>
    <section class="wrap section reveal"><h2>最近更新</h2><div class="sub">一节课程讲透一个知识点，图文 + 视频 + 资料</div>
      <div class="grid">${recent.map(videoCard).join('')||'<div class="empty"><span class="empty-ico">📚</span>内容准备中，敬请期待</div>'}</div>
      <div class="center"><a class="btn ghost" href="videos.html">查看全部课程 →</a></div>
    </section>
    <section class="wrap section reveal"><h2>全学段覆盖</h2><div class="sub">小学一年级到高中三年级，全年级全学科，持续更新中</div>
      <div class="grid">${cols.map(c=>{
        const building=c.status==='building';
        return `<a class="card stage ${building?'stage-building':''}" href="videos.html?grade=${encodeURIComponent(c.grade)}">
          <div class="body"><div class="tags"><span class="tag ${building?'tag-building':''}">${c.icon||'📘'} ${building?'🚧 建设中':'更新中'}</span></div>
          <h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p></div>${building?'<span class="coming-soon">即将上线</span>':''}</a>`;
      }).join('')}</div>
      ${(DATA.subjects||[]).length?`<div class="subject-cover"><span class="sc-label">覆盖学科 · 逐步更新</span><div class="sc-tags">${DATA.subjects.map(s=>{
        const on=offeredSubjects.has(s);
        return `<span class="sc-tag ${on?'on':'building'}" title="${on?'已开课':'建设中，敬请期待'}">${esc(s)}${on?'<span class="sc-dot">●</span>':''}</span>`;
      }).join('')}</div><p class="sc-note">带 <span class="sc-dot">●</span> 的学科已有课程，其余学科按课标陆续更新</p></div>`:''}
    </section>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML()+playerModalHTML()+toTopHTML());
}

/* ---------- 课程库页（搜索+筛选+排序） ---------- */
function renderVideos(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('videos'));
  const p=getParams(), q=p.get('q')||'', chapter=p.get('chapter')||'';
  // 旧链接兼容：grade/subject 自动映射到统一分类 cat
  let cat=p.get('cat')||'';
  if(!cat){ const legacy=p.get('grade')||p.get('subject')||''; if(legacy&&legacy!=='全部') cat=legacy; }
  const vids=DATA.videos||[];
  // 起步阶段只给搜索框：内容少先不摆筛选的空架子，等积累到阈值再自动放开
  const showFilters=vids.length>=6;
  // 统一分类：品牌片归「品牌」，其余按学段。一个视频只落一个分类，不再串味
  const catOf=v=>(v.subject==='品牌')?'品牌':(v.grade||'其他');
  const catOrder=['品牌','小学','初中','高中'];
  const usedCats=new Set(vids.map(catOf));
  const cats=['全部',...catOrder.filter(c=>usedCats.has(c))];
  // 章节：出现≥2个不同取值才显示该行，杜绝空架子
  const chapterSet=new Set(vids.map(v=>v.chapter).filter(x=>x&&x!=='—'&&x!=='全部'));
  const showChapter=showFilters && chapterSet.size>=2;
  const sort=p.get('sort')||'new';
  document.getElementById('app').innerHTML=`
    <section class="wrap section reveal">
      <h2>课程库</h2><div class="sub">每节课程是一篇图文讲解，内嵌视频与配套资料，搜知识点就能找到</div>
      ${searchBarHTML('搜索课程 / 知识点 / 章节，如：正数、温度计、七年级…', q)}
      ${showFilters?`<div class="filters">
        ${chipGroup('分类','cat',cats,cat||'全部')}
        ${showChapter?chipGroup('章节','chapter',['全部',...chapterSet],chapter||'全部'):''}
        <div class="filter-row"><span class="flabel">排序</span><div class="chips" data-key="sort" role="group" aria-label="排序">
          ${[['new','最新'],['old','最早'],['title','标题']].map(([v,t])=>`<button class="chip ${sort===v?'on':''}" data-val="${v}" aria-pressed="${sort===v}">${t}</button>`).join('')}
        </div></div>
      </div>`:''}
      <div id="vstat" class="vstat" aria-live="polite"></div>
      <div class="grid" id="vgrid"></div>
    </section>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML()+playerModalHTML()+toTopHTML());
  const apply=()=>{
    const qv=document.getElementById('q').value.trim();
    let items=SEARCH_INDEX.filter(i=>i.type==='video')
      .filter(i=>matchQuery(i,qv))
      .filter(i=>!cat||cat==='全部'||catOf(i.ref)===cat)
      .filter(i=>!chapter||chapter==='全部'||i.chapter===chapter);
    if(sort==='old') items.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    else if(sort==='title') items.sort((a,b)=>a.title.localeCompare(b.title,'zh'));
    else items.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    document.getElementById('vstat').innerHTML=`共 <b>${items.length}</b> 条内容${qv?` · 匹配「${esc(qv)}」`:''}`;
    document.getElementById('vgrid').innerHTML=items.map(i=>videoCard(i.ref)).join('')||
      '<div class="empty"><span class="empty-ico">🔍</span>没有匹配的课程，试试清除筛选条件</div>';
  };
  bindSearch(apply); bindChips(apply, (k,v)=>setParam(k,v)); apply();
}

/* ---------- 资料页 ---------- */
function renderResources(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('resources'));
  const p=getParams(), q=p.get('q')||'';
  document.getElementById('app').innerHTML=`
    <section class="wrap section reveal">
      <h2>配套资料</h2><div class="sub">资料免费提供，通过迅雷云盘领取；与课程知识点一一对应</div>
      ${searchBarHTML('搜索资料 / 知识点，如：正数、七年级…', q)}
      <div id="rstat" class="vstat" aria-live="polite"></div>
      <div class="grid" id="rgrid"></div>
    </section>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML()+toTopHTML());
  const apply=()=>{
    const qv=document.getElementById('q').value.trim();
    const items=SEARCH_INDEX.filter(i=>i.type==='resource').filter(i=>matchQuery(i,qv));
    document.getElementById('rstat').innerHTML=`共 <b>${items.length}</b> 份资料${qv?` · 匹配「${esc(qv)}」`:''}`;
    document.getElementById('rgrid').innerHTML=items.map(i=>resourceCard(i.ref)).join('')||
      '<div class="empty"><span class="empty-ico">📦</span>没有匹配的资料</div>';
  };
  bindSearch(apply); apply();
}

/* ---------- 关于页（双分层 + 访问地址专区） ---------- */
function renderAbout(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('about'));
  const s=DATA.site, layers=DATA.aboutLayers||{};
  const qr=(m)=>m.qr!==false?`<img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(m.url.startsWith('http')?m.url:location.origin+'/'+m.url)}" alt="${esc(m.name)}二维码" loading="lazy">`:'';
  const layerHTML=(obj,cls,ico)=>obj?`<div class="layer ${cls}"><h3>${ico} ${esc(obj.title)}</h3><ul>${(obj.points||[]).map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div>`:'';
  document.getElementById('app').innerHTML=`
    <section class="wrap section about reveal">
      <h2>关于课代表</h2><div class="sub">你的课堂学习小伙伴 · 免费分享，一起稳得分</div>
      <div class="card pad">
        <p><strong>课代表</strong>，${esc(s.intro)}</p>
        <p style="margin-top:12px">口号：<b class="hl">${esc(s.slogan)}</b>——帮你梳理知识体系、讲解核心重点、归纳常见题型、分析易错陷阱。</p>
        <p style="margin-top:12px">${esc(s.updateNote||'')}，配套资料免费提供。</p>
      </div>
      <div class="layer-grid">
        ${layerHTML(layers.forParents,'','👨‍👩‍👧')}
        ${layerHTML(layers.forStudents,'kid','🎒')}
      </div>
      <h2 style="margin-top:36px" id="mirrors">访问地址</h2>
      <div class="sub">多个入口互为镜像，内容完全一样；任一地址打不开，请用其他地址访问。建议收藏主站和稳定底座。</div>
      <div class="mirror-list">
        ${(DATA.mirrors||[]).map(m=>`
          <a class="mirror" href="${esc(m.url)}" ${m.url.startsWith('http')?'target="_blank" rel="noopener"':''}>
            ${qr(m)}
            <div><span class="tag">${esc(m.tag)}</span><h3>${esc(m.name)}</h3><p>${esc(m.url)}</p>${m.desc?`<p class="mdesc">${esc(m.desc)}</p>`:''}</div>
          </a>`).join('')}
      </div>
      ${s.bilibili?`<div class="center"><a class="btn" href="${esc(s.bilibili)}" target="_blank" rel="noopener">访问 B站</a></div>`:''}
    </section>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML()+toTopHTML());
}

/* ---------- 交互绑定 ---------- */
function bindSearch(apply){
  const inp=document.getElementById('q'), clr=document.getElementById('qclear');
  if(!inp) return;
  let t; inp.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>{ setParam('q',inp.value.trim()); apply(); },120); });
  clr.addEventListener('click',()=>{ inp.value=''; setParam('q',''); apply(); inp.focus(); });
}
function bindChips(apply,onChange){
  document.querySelectorAll('.chips').forEach(group=>{
    group.addEventListener('click',e=>{
      const b=e.target.closest('.chip'); if(!b) return;
      group.querySelectorAll('.chip').forEach(c=>{c.classList.remove('on');c.setAttribute('aria-pressed','false');});
      b.classList.add('on'); b.setAttribute('aria-pressed','true');
      onChange(group.dataset.key, b.dataset.val==='全部'?'':b.dataset.val);
      apply();
    });
  });
}

/* 入场动画：元素进入视口时淡入上移，尊重减少动效设置 */
function bindReveal(){
  const els=document.querySelectorAll('.reveal');
  if(!els.length) return;
  // 减少动效 或 不支持 IO：直接显示，不隐藏内容
  if((window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || !('IntersectionObserver' in window)){
    els.forEach(el=>el.classList.add('in')); return;
  }
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
  },{threshold:0.08, rootMargin:'0px 0px -40px 0px'});
  els.forEach(el=>io.observe(el));
  // 保险：1.2s 后无论 IO 是否触发，强制显示全部，杜绝内容永久隐藏
  setTimeout(()=>els.forEach(el=>el.classList.add('in')), 1200);
}

/* 返回顶部按钮（所有页面） */
function bindToTop(){
  const btn=document.getElementById('toTop'); if(!btn) return;
  const onScroll=()=>btn.classList.toggle('on', window.scrollY>400);
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();
  btn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
}

/* ---------- 启动 ---------- */
async function init(page){
  try{
    await loadData();
    ({home:renderHome,videos:renderVideos,resources:renderResources,about:renderAbout}[page])();
    bindToTop(); bindReveal();
  }catch(e){
    document.getElementById('app').innerHTML=`<div class="wrap section"><div class="empty">页面加载失败：${esc(e.message)}<br>请确认 content.json 可访问</div></div>`;
  }
}
window.init=init; window.bindReveal=bindReveal;
