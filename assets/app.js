/* 课代表官网 v2：数据驱动 + 全站搜索 + 多维筛选。内容单一真源 content.json。 */
let DATA = null;
let SEARCH_INDEX = [];

async function loadData(){
  const r = await fetch('content.json', {cache:'no-store'});
  if(!r.ok) throw new Error('content.json 加载失败');
  DATA = await r.json();
  buildSearchIndex();
  return DATA;
}

/* ---------- 搜索索引：把 videos + resources 展平成统一可搜索条目 ---------- */
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
function navHTML(active){
  const links=[['index.html','首页','home'],['videos.html','课程','videos'],['resources.html','资料','resources'],['about.html','关于','about']];
  return `<header><div class="wrap bar">
    <a class="brand" href="index.html"><img src="${DATA.site.logo}" alt=""><span>课<b>代表</b></span></a>
    <nav>${links.map(([h,t,k])=>`<a href="${h}" class="${active===k?'on':''}">${t}</a>`).join('')}</nav>
  </div></header>`;
}

/* 视觉段落：纯文字品牌色块，零外链图片（遵循「图片走外链且不造假数据」约束，
   当前无自有课程截图，不用第三方氛围图充数；后续有真实课程封面再在 content.json 配图）。 */
function creditsHTML(){
  return `${esc(DATA.site.name)} · 按课标持续更新 · 图文加短视频讲透知识点`;
}
function bandHTML(){
  return `<section class="brand-band bleed">
    <div class="bb-cell bb-navy" data-reveal><span class="bb-kicker">讲得明白</span><strong>把知识点<br>一次讲透</strong></div>
    <div class="bb-cell bb-gold" data-reveal style="--i:1"><span class="bb-kicker">抓得住重点</span><strong>核心考点<br>一目了然</strong></div>
    <div class="bb-cell bb-red" data-reveal style="--i:2"><span class="bb-kicker">学得有方向</span><strong>易错陷阱<br>提前避开</strong></div>
  </section>`;
}
function footerHTML(){
  return `<footer>
    <div class="foot-top">
      <div class="foot-invite">
        <h2 class="head">把下一个知识点，<br>交给课代表。</h2>
        <a class="btn" href="videos.html">开始学习</a>
      </div>
      <div class="foot-links">
        <a href="videos.html">课程</a>
        <a href="resources.html">资料</a>
        <a href="about.html">关于</a>
        <a href="about.html#mirrors">访问地址</a>
      </div>
    </div>
    <div class="foot-credit"><span>${esc(DATA.site.slogan)} · ${esc(DATA.site.updateNote||'')}</span><span>${creditsHTML()}</span></div>
    <span class="foot-wordmark" aria-hidden="true">课代表</span>
  </footer>`;
}

function statusBadge(v){
  if(v.status==='live') return '<span class="badge live">▶ 可播放</span>';
  if(v.status==='pending') return '<span class="badge pending">待配置</span>';
  return '<span class="badge local">即将上线</span>';
}

function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- 视频卡片 ---------- */
function videoCard(v){
  return `<a class="card" href="course.html?id=${encodeURIComponent(v.id)}">
    <img class="cover" src="${esc(v.cover)}" alt="${esc(v.title)}" loading="lazy">
    <div class="body">
      <div class="tags"><span class="tag">${esc(v.subject)}</span><span class="tag gold">${esc(v.grade)}</span>${statusBadge(v)}</div>
      <h3>${esc(v.title)}</h3>
      <p>${esc(v.desc||'')}</p>
      <div class="meta">${v.chapter&&v.chapter!=='—'?`${esc(v.chapter)} · `:''}${v.duration?`${esc(v.duration)} · `:''}${esc(v.date||'')}</div>
      <span class="btn">阅读课程 →</span>
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
      ${v?`<div class="meta">关联视频：<a href="videos.html?q=${encodeURIComponent(v.title)}">${esc(v.title)}</a></div>`:''}
      ${ok
        ? `<a class="btn" href="${esc(r.link)}" target="_blank" rel="noopener">获取资料</a>`
        : `<button class="btn ghost" disabled title="${esc(r.statusNote||'')}">即将开放</button>`}
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
  return `<div class="modal" id="playerModal" onclick="if(event.target===this)closePlayer()">
    <div class="modal-box"><div class="modal-head"><span id="playerTitle"></span><button onclick="closePlayer()" aria-label="关闭">×</button></div>
    <iframe id="playerFrame" class="player" allowfullscreen allow="autoplay; fullscreen"></iframe></div></div>`;
}

/* ---------- 搜索栏 + 筛选组件 ---------- */
function searchBarHTML(ph,q){
  return `<div class="searchbar" data-rise><span aria-hidden="true">搜索</span><input id="q" type="search" placeholder="${esc(ph)}" value="${esc(q)}" autocomplete="off" aria-label="搜索"><button id="qclear" class="qclear" title="清除" aria-label="清除">×</button><button class="btn qgo" id="qgo" aria-label="搜索">查找 →</button></div>`;
}
function chipGroup(label,key,options,current){
  return `<div class="filter-row"><span class="flabel">${label}</span><div class="chips" data-key="${key}">`+
    options.map(o=>`<button class="chip ${current===o?'on':''}" data-val="${esc(o)}">${esc(o)}</button>`).join('')+`</div></div>`;
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
  const s=DATA.site, vids=DATA.videos||[], cols=DATA.collections||[];
  const live=vids.filter(v=>v.status==='live').length;
  const pts=new Set(); vids.forEach(v=>(v.tags||[]).forEach(t=>pts.add(t)));
  const recent=[...vids].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,7);
  document.getElementById('app').innerHTML=`
    <section class="hero wrap">
      <div class="hero-top">
        <span class="mono">课<em>代表</em></span>
        <span class="toplinks"><a href="videos.html">课程</a><a href="resources.html">资料</a><a href="about.html">关于</a></span>
      </div>
      <div class="hero-main">
        <img class="hero-avatar" src="${esc(s.logo)}" alt="课代表头像" data-reveal>
        <div class="hero-name lines">
          <h1 class="display"><span class="line"><span data-line style="--i:0">抓考点</span></span><span class="line"><span class="ink2" data-line style="--i:1">学明白</span></span></h1>
        </div>
      </div>
      <div class="hero-foot">
        <p class="support">${esc(s.slogan)}。<br>图文加短视频，<b>3 到 5 分钟讲透一个知识点</b>。</p>
        <a class="btn" href="videos.html" data-rise style="--i:2">开始学习 →</a>
      </div>
    </section>

    <section class="stats-stmt wrap">
      <h2 class="sr-only">课程数据</h2>
      <p class="statement" data-reveal>从小学到高中，<span class="fig">${vids.length}</span> 节课拆成 <span class="fig">${pts.size}</span> 个知识点，<span class="fig">${live}</span> 节配了视频讲解。</p>
    </section>

    ${bandHTML()}

    <section class="lineup wrap">
      <h2 class="head" style="color:var(--light);margin-bottom:.6rem" data-reveal>最近更新</h2>
      <p class="leadline">一节课程讲透一个知识点。输入知识点即可在课程库里找到它。</p>
      ${recent.map((v,i)=>`<div class="row" data-reveal style="--i:${i}">
        <a class="who" href="course.html?id=${encodeURIComponent(v.id)}">${esc(v.title)}</a>
        <span class="fmt">${esc(v.subject)}${v.chapter&&v.chapter!=='—'?' · '+esc(v.chapter):''}</span>
        <span class="when">${esc(v.date||'')}</span>
      </div>`).join('')||'<div class="empty">内容准备中，敬请期待</div>'}
      <div class="center"><a class="btn ghost on-light link-under" href="videos.html">查看全部课程</a></div>
    </section>

    <section class="poster-list wrap">
      <div class="plist-head" data-reveal>按学段学</div>
      ${cols.map((c,i)=>`<div class="pitem" data-reveal style="--i:${i}">
        <a class="pname" href="videos.html?grade=${encodeURIComponent(c.grade)}">${esc(c.name)}</a>
        <p class="pdesc">${c.status==='active'?'按课标章节持续更新':''}</p>
      </div>`).join('')}
    </section>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML()+playerModalHTML());
}

/* ---------- 视频页（搜索+筛选+排序） ---------- */
function renderVideos(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('videos'));
  const p=getParams(), q=p.get('q')||'', grade=p.get('grade')||'', subject=p.get('subject')||'', chapter=p.get('chapter')||'', sort=p.get('sort')||'new';
  const grades=['全部','小学','初中','高中','全部学段','品牌'];
  const subjects=['全部',...new Set((DATA.videos||[]).map(v=>v.subject).filter(Boolean))];
  const chapters=['全部',...new Set((DATA.videos||[]).map(v=>v.chapter).filter(x=>x&&x!=='—'))];
  document.getElementById('app').innerHTML=`
    <section class="wrap">
      <div class="page-intro"><h2 class="head">课程库</h2><p class="sub">每节课程是一篇图文讲解，内嵌视频与配套资料。输入知识点即可查找。</p></div>
      ${searchBarHTML('搜索课程 / 知识点 / 章节，如：正数、温度计、七年级…', q)}
      <div class="filters">
        ${chipGroup('学段','grade',grades,grade||'全部')}
        ${chipGroup('学科','subject',subjects,subject||'全部')}
        ${chipGroup('章节','chapter',chapters,chapter||'全部')}
        <div class="filter-row"><span class="flabel">排序</span><div class="chips" data-key="sort">
          ${[['new','最新'],['old','最早'],['title','标题']].map(([v,t])=>`<button class="chip ${sort===v?'on':''}" data-val="${v}">${t}</button>`).join('')}
        </div></div>
      </div>
      <div id="vstat" class="vstat"></div>
      <div class="grid" id="vgrid"></div>
    </section>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML()+playerModalHTML());
  const apply=()=>{
    const qv=document.getElementById('q').value.trim();
    let items=SEARCH_INDEX.filter(i=>i.type==='video')
      .filter(i=>matchQuery(i,qv))
      .filter(i=>!grade||grade==='全部'||i.grade===grade)
      .filter(i=>!subject||subject==='全部'||i.subject===subject)
      .filter(i=>!chapter||chapter==='全部'||i.chapter===chapter);
    if(sort==='old') items.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    else if(sort==='title') items.sort((a,b)=>a.title.localeCompare(b.title,'zh'));
    else items.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    document.getElementById('vstat').innerHTML=`共 <b>${items.length}</b> 节课程${qv?` · 匹配「${esc(qv)}」`:''}`;
    document.getElementById('vgrid').innerHTML=items.map(i=>videoCard(i.ref)).join('')||
      '<div class="empty">没有匹配的课程，试试清除筛选条件</div>';
  };
  bindSearch(apply); bindChips(apply, (k,v)=>setParam(k,v)); apply();
}

/* ---------- 资料页 ---------- */
function renderResources(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('resources'));
  const p=getParams(), q=p.get('q')||'';
  document.getElementById('app').innerHTML=`
    <section class="wrap">
      <div class="page-intro"><h2 class="head">配套资料</h2><p class="sub">资料免费提供，通过网盘领取，与课程知识点一一对应。</p></div>
      ${searchBarHTML('搜索资料 / 知识点，如：正数、七年级…', q)}
      <div id="rstat" class="vstat"></div>
      <div class="grid" id="rgrid"></div>
    </section>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML());
  const apply=()=>{
    const qv=document.getElementById('q').value.trim();
    const items=SEARCH_INDEX.filter(i=>i.type==='resource').filter(i=>matchQuery(i,qv));
    document.getElementById('rstat').innerHTML=`共 <b>${items.length}</b> 份资料${qv?` · 匹配「${esc(qv)}」`:''}`;
    document.getElementById('rgrid').innerHTML=items.map(i=>resourceCard(i.ref)).join('')||
      '<div class="empty">没有匹配的资料</div>';
  };
  bindSearch(apply); apply();
}

/* ---------- 关于页（含访问地址专区） ---------- */
function renderAbout(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('about'));
  const s=DATA.site;
  const qr=(m)=>m.qr!==false?`<img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(m.url.startsWith('http')?m.url:location.origin+'/'+m.url)}" alt="二维码">`:'';
  document.getElementById('app').innerHTML=`
    <section class="wrap about">
      <div class="page-intro"><h2 class="head">关于课代表</h2><p class="sub">你的课堂学习小能手</p></div>
      <div class="card pad">
        <p><strong>课代表</strong>，${esc(s.intro)}</p>
        <p style="margin-top:12px">我们帮你：<b class="hl">梳理知识体系</b>、<b class="hl">讲解核心重点</b>、<b class="hl">归纳常见题型</b>、<b class="hl">分析易错陷阱</b>。</p>
        <p style="margin-top:12px">${esc(s.updateNote||'')}，配套资料免费提供。</p>
      </div>
      <h2 class="head" style="margin-top:56px;font-size:var(--step-head)" id="mirrors">访问地址</h2>
      <p class="sub" style="color:var(--ink-soft);margin-bottom:1.5rem">多个入口互为镜像，内容完全一样；任一地址打不开，请用其他地址访问</p>
      <div class="mirror-list">
        ${(DATA.mirrors||[]).map(m=>`
          <a class="mirror" href="${esc(m.url)}" target="_blank" rel="noopener">
            ${qr(m)}
            <div><span class="tag">${esc(m.tag)}</span><h3>${esc(m.name)}</h3><p>${esc(m.url)}</p></div>
          </a>`).join('')}
      </div>
      ${s.bilibili?`<div class="center" style="margin-top:20px"><a class="btn" href="${esc(s.bilibili)}" target="_blank">访问 B站</a></div>`:''}
    </section>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML());
}

/* ---------- 交互绑定 ---------- */
function bindSearch(apply){
  const inp=document.getElementById('q'), clr=document.getElementById('qclear'), go=document.getElementById('qgo');
  if(!inp) return;
  let t; inp.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>{ setParam('q',inp.value.trim()); apply(); },120); });
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); clearTimeout(t); setParam('q',inp.value.trim()); apply(); } });
  clr.addEventListener('click',()=>{ inp.value=''; setParam('q',''); apply(); inp.focus(); });
  if(go) go.addEventListener('click',()=>{ clearTimeout(t); setParam('q',inp.value.trim()); apply(); inp.focus(); });
}
function bindChips(apply,onChange){
  document.querySelectorAll('.chips').forEach(group=>{
    group.addEventListener('click',e=>{
      const b=e.target.closest('.chip'); if(!b) return;
      group.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
      b.classList.add('on');
      onChange(group.dataset.key, b.dataset.val==='全部'?'':b.dataset.val);
      apply();
    });
  });
}

/* ---------- 滚动入场 ---------- */
function setupReveal(){
  const els=document.querySelectorAll('[data-reveal]');
  if(!('IntersectionObserver' in window)){ els.forEach(e=>e.classList.add('is-in')); return; }
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('is-in'); io.unobserve(en.target); } });
  },{threshold:.12,rootMargin:'0px 0px -8% 0px'});
  els.forEach(e=>io.observe(e));
}

/* ---------- 启动 ---------- */
async function init(page){
  try{
    await loadData();
    ({home:renderHome,videos:renderVideos,resources:renderResources,about:renderAbout}[page])();
    setupReveal();
  }catch(e){
    document.getElementById('app').innerHTML=`<div class="wrap section"><div class="empty">页面加载失败：${esc(e.message)}<br>请确认 content.json 可访问</div></div>`;
  }
}
