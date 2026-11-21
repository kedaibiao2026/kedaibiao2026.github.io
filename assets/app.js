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
  const links=[['index.html','首页','home'],['videos.html','视频','videos'],['resources.html','资料','resources'],['about.html','关于','about']];
  return `<header><div class="wrap bar">
    <a class="brand" href="index.html"><img src="${DATA.site.logo}" alt=""><span>课<b>代表</b></span></a>
    <nav>${links.map(([h,t,k])=>`<a href="${h}" class="${active===k?'on':''}">${t}</a>`).join('')}</nav>
  </div></header>`;
}

function footerHTML(){
  return `<footer><div class="wrap">
    <p><strong style="color:#ffd035">课代表</strong> · ${DATA.site.slogan}</p>
    <p style="margin-top:8px">${DATA.site.updateNote||''}</p>
    <p style="margin-top:10px"><a href="about.html#mirrors">查看全部访问地址 →</a></p>
  </div></footer>`;
}

function statusBadge(v){
  if(v.status==='live') return '<span class="badge live">▶ 可播放</span>';
  if(v.status==='pending') return '<span class="badge pending">待配置</span>';
  return '<span class="badge local">即将上线</span>';
}

function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- 视频卡片 ---------- */
function videoCard(v){
  const playable = v.status==='live' && v.bvid;
  return `<article class="card">
    <img class="cover" src="${esc(v.cover)}" alt="${esc(v.title)}" loading="lazy">
    <div class="body">
      <div class="tags"><span class="tag">${esc(v.subject)}</span><span class="tag gold">${esc(v.grade)}</span>${statusBadge(v)}</div>
      <h3>${esc(v.title)}</h3>
      <p>${esc(v.desc||'')}</p>
      <div class="meta">${v.chapter&&v.chapter!=='—'?`📖 ${esc(v.chapter)} · `:''}${v.duration?`⏱ ${esc(v.duration)} · `:''}${esc(v.date||'')}</div>
      ${playable
        ? `<button class="btn" onclick="openPlayer('${esc(v.bvid)}','${esc(v.title).replace(/'/g,"\\'")}')">▶ 立即播放</button>`
        : `<button class="btn ghost" disabled title="${esc(v.statusNote||'')}">即将上线</button>`}
    </div>
  </article>`;
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
  return `<div class="searchbar"><span class="ico">🔍</span><input id="q" type="search" placeholder="${esc(ph)}" value="${esc(q)}" autocomplete="off"><button id="qclear" class="qclear" title="清除">×</button></div>`;
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
  document.body.insertAdjacentHTML('afterbegin', navHTML('home'));
  const s=DATA.site, vids=DATA.videos||[], cols=DATA.collections||[];
  const live=vids.filter(v=>v.status==='live').length;
  const pts=new Set(); vids.forEach(v=>(v.tags||[]).forEach(t=>pts.add(t)));
  const recent=[...vids].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);
  document.getElementById('app').innerHTML=`
    <div class="hero">
      <img src="${esc(s.logo)}" alt="课代表">
      <h1>课<b>代表</b>来咯!</h1>
      <div class="slogan">${esc(s.slogan)}</div>
      <p>${esc(s.intro)}</p>
      <div class="actions"><a class="btn" href="videos.html">开始学习</a><a class="btn gold" href="resources.html">找资料</a></div>
    </div>
    <div class="wrap">
      <div class="stats">
        <div><b>${vids.length}</b><span>上线视频</span></div>
        <div><b>${pts.size}</b><span>知识点</span></div>
        <div><b>${cols.length}</b><span>学段专辑</span></div>
        <div><b>${live}</b><span>可在线播放</span></div>
      </div>
    </div>
    <section class="wrap section"><h2>最近更新</h2><div class="sub">一个视频讲透一个知识点</div>
      <div class="grid">${recent.map(videoCard).join('')||'<div class="empty">内容准备中，敬请期待</div>'}</div>
      <div class="center"><a class="btn ghost" href="videos.html">查看全部视频 →</a></div>
    </section>
    <section class="wrap section"><h2>按学段学</h2><div class="sub">选择学段，进入对应专辑</div>
      <div class="grid">${cols.map(c=>`
        <a class="card stage ${c.status==='building'?'dim':''}" href="videos.html?grade=${encodeURIComponent(c.grade)}">
          <div class="body"><span class="tag ${c.status==='active'?'gold':''}">${c.status==='active'?'更新中':'建设中'}</span>
          <h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p></div></a>`).join('')}</div>
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
    <section class="wrap section">
      <h2>视频库</h2><div class="sub">按知识点查找，点击播放（B站外链，本站不存视频）</div>
      ${searchBarHTML('搜索知识点 / 标题 / 章节，如：正数、温度计、七年级…', q)}
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
    document.getElementById('vstat').innerHTML=`共 <b>${items.length}</b> 个视频${qv?` · 匹配「${esc(qv)}」`:''}`;
    document.getElementById('vgrid').innerHTML=items.map(i=>videoCard(i.ref)).join('')||
      '<div class="empty">没有匹配的视频，试试清除筛选条件</div>';
  };
  bindSearch(apply); bindChips(apply, (k,v)=>setParam(k,v)); apply();
}

/* ---------- 资料页 ---------- */
function renderResources(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('resources'));
  const p=getParams(), q=p.get('q')||'';
  document.getElementById('app').innerHTML=`
    <section class="wrap section">
      <h2>配套资料</h2><div class="sub">资料免费提供，通过网盘领取；与视频知识点一一对应</div>
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
    <section class="wrap section about">
      <h2>关于课代表</h2><div class="sub">你的课堂学习小能手</div>
      <div class="card pad">
        <p><strong>课代表</strong>，${esc(s.intro)}</p>
        <p style="margin-top:12px">我们帮你：<b class="hl">梳理知识体系</b>、<b class="hl">讲解核心重点</b>、<b class="hl">归纳常见题型</b>、<b class="hl">分析易错陷阱</b>。</p>
        <p style="margin-top:12px">${esc(s.updateNote||'')}，配套资料免费提供。</p>
      </div>
      <h2 style="margin-top:36px" id="mirrors">访问地址</h2>
      <div class="sub">多个入口互为镜像，内容完全一样；任一地址打不开，请用其他地址访问</div>
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
  const inp=document.getElementById('q'), clr=document.getElementById('qclear');
  if(!inp) return;
  let t; inp.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>{ setParam('q',inp.value.trim()); apply(); },120); });
  clr.addEventListener('click',()=>{ inp.value=''; setParam('q',''); apply(); inp.focus(); });
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

/* ---------- 启动 ---------- */
async function init(page){
  try{
    await loadData();
    ({home:renderHome,videos:renderVideos,resources:renderResources,about:renderAbout}[page])();
  }catch(e){
    document.getElementById('app').innerHTML=`<div class="wrap section"><div class="empty">页面加载失败：${esc(e.message)}<br>请确认 content.json 可访问</div></div>`;
  }
}
