/* 课代表官网：读取 content.json 渲染内容。数据单一真源，改内容只改 JSON。 */
let DATA = null;

async function loadData(){
  const r = await fetch('content.json', {cache:'no-store'});
  if(!r.ok) throw new Error('content.json 加载失败');
  DATA = await r.json();
  return DATA;
}

function navHTML(active){
  const site = DATA.site;
  const links = [
    ['index.html','首页',active==='home'],
    ['videos.html','视频',active==='videos'],
    ['resources.html','资料',active==='resources'],
    ['about.html','关于',active==='about'],
  ];
  return `<header><div class="wrap bar">
    <a class="brand" href="index.html"><img src="${site.logo}" alt=""><span>课<b>代表</b></span></a>
    <nav>${links.map(([h,t,on])=>`<a href="${h}" class="${on?'on':''}">${t}</a>`).join('')}</nav>
  </div></header>`;
}

function mirrorLinksHTML(){
  return (DATA.mirrors||[]).map(m=>
    `<a href="${m.url}" target="_blank" rel="noopener" title="${m.tag}">${m.name}</a>`
  ).join('<span style="color:#5a6690;margin:0 6px">·</span>');
}

function footerHTML(){
  const s = DATA.site;
  return `<footer><div class="wrap">
    <p><strong style="color:#ffd035">课代表</strong> · ${s.slogan}</p>
    <p style="margin-top:8px">${s.intro}</p>
    <p style="margin-top:12px;font-size:.85rem;color:#8894b8">访问地址（互为镜像，任一打不开可换其他）：</p>
    <p style="margin-top:4px;font-size:.85rem">${mirrorLinksHTML()}</p>
    ${s.bilibili?`<p style="margin-top:10px"><a href="${s.bilibili}" target="_blank">B站</a></p>`:''}
  </div></footer>`;
}

function statusBadge(v){
  if(v.status==='live') return '<span class="badge live">可播放</span>';
  return `<span class="badge local">${v.statusNote?'待上线':'本地'}</span>`;
}

function videoCard(v){
  const playable = v.status==='live' && v.bvid;
  return `<div class="card">
    <img class="cover" src="${v.cover}" alt="${v.title}">
    <div class="body">
      <div><span class="tag">${v.subject}</span><span class="tag gold">${v.grade}</span>${statusBadge(v)}</div>
      <h3>${v.title}</h3>
      <p>${v.desc||''}</p>
      ${v.chapter&&v.chapter!=='—'?`<div style="font-size:.82rem;color:var(--muted)">教材：${v.chapter}</div>`:''}
      ${playable
        ? `<button class="btn" style="margin-top:12px" onclick="openPlayer('${v.bvid}','${v.title.replace(/'/g,"\\'")}')">▶ 立即播放</button>`
        : `<button class="btn gold" style="margin-top:12px" disabled title="${v.statusNote||''}">即将上线</button>`}
    </div>
  </div>`;
}

function openPlayer(bvid,title){
  const box = document.getElementById('playerModal');
  document.getElementById('playerTitle').textContent = title;
  document.getElementById('playerFrame').src = `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&danmaku=0`;
  box.classList.add('on');
}
function closePlayer(){
  const box = document.getElementById('playerModal');
  box.classList.remove('on');
  document.getElementById('playerFrame').src = '';
}
window.openPlayer = openPlayer;
window.closePlayer = closePlayer;

function playerModalHTML(){
  return `<div class="modal" id="playerModal" onclick="if(event.target===this)closePlayer()">
    <div class="modal-box">
      <div class="modal-head"><span id="playerTitle"></span><button onclick="closePlayer()">×</button></div>
      <iframe id="playerFrame" class="player" allowfullscreen></iframe>
    </div>
  </div>`;
}

function renderHome(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('home'));
  const s = DATA.site;
  const latest = DATA.videos.slice(0,6);
  document.getElementById('app').innerHTML = `
    <div class="hero">
      <img src="${s.logo}" alt="课代表">
      <h1>课<b>代表</b>来咯!</h1>
      <div class="slogan">${s.slogan}</div>
      <p>${s.intro}</p>
      <div class="actions">
        <a class="btn" href="videos.html">看视频</a>
        <a class="btn gold" href="resources.html">找资料</a>
      </div>
    </div>
    <div class="wrap section">
      <h2>最新内容</h2>
      <div class="sub">一个视频讲透一个知识点，按课标顺序更新</div>
      <div class="grid">${latest.map(videoCard).join('')||'<div class="empty">内容准备中，敬请期待</div>'}</div>
    </div>
    <div class="wrap section">
      <h2>学科专辑</h2>
      <div class="sub">按学段组织，合集串成完整课程</div>
      <div class="grid">${DATA.collections.map(c=>`
        <div class="card"><div class="body">
          <span class="tag gold">${c.grade}</span>
          <h3>${c.name}</h3><p>${c.desc}</p>
        </div></div>`).join('')}</div>
    </div>
    <div class="wrap section">
      <h2>访问地址</h2>
      <div class="sub">多个入口互为镜像，任一地址打不开时请用其他地址访问，内容完全一样</div>
      <div class="grid">${(DATA.mirrors||[]).map(m=>`
        <a class="card" href="${m.url}" target="_blank" rel="noopener" style="display:block">
          <div class="body">
            <span class="tag">${m.tag}</span>
            <h3 style="word-break:break-all;font-size:1rem;margin-top:8px">${m.name}</h3>
          </div>
        </a>`).join('')}</div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML()+playerModalHTML());
}

function renderVideos(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('videos'));
  document.getElementById('app').innerHTML = `
    <div class="wrap section">
      <h2>全部视频</h2>
      <div class="sub">按学段浏览，点击播放（B站外链，不占用本站服务器）</div>
      <div class="grid">${DATA.videos.map(videoCard).join('')||'<div class="empty">视频准备中</div>'}</div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML()+playerModalHTML());
}

function renderResources(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('resources'));
  document.getElementById('app').innerHTML = `
    <div class="wrap section">
      <h2>配套资料</h2>
      <div class="sub">资料包通过网盘分享，关注后可获取</div>
      <div class="grid">${DATA.resources.map(r=>`
        <div class="card"><div class="body">
          ${r.link?`<a href="${r.link}" target="_blank">`:''}
          <h3>${r.title}</h3>
          <p>${r.desc||''}</p>
          ${r.status==='pending'?'<span class="badge">待配置链接</span>':'<span class="btn">获取资料</span>'}
          ${r.link?'</a>':''}
        </div></div>`).join('')||'<div class="empty">资料准备中</div>'}</div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML());
}

function renderAbout(){
  document.body.insertAdjacentHTML('afterbegin', navHTML('about'));
  const s = DATA.site;
  document.getElementById('app').innerHTML = `
    <div class="wrap section" style="max-width:760px">
      <h2>关于课代表</h2>
      <div class="sub">你的课堂学习小能手</div>
      <div class="card" style="padding:24px;line-height:2">
        <p><strong>课代表</strong>，${s.intro}</p>
        <p style="margin-top:12px">我们帮你：<b style="color:var(--red)">梳理知识体系</b>、<b style="color:var(--red)">讲解核心重点</b>、<b style="color:var(--red)">归纳常见题型</b>、<b style="color:var(--red)">分析易错陷阱</b>。</p>
        <p style="margin-top:12px">每个知识点做成 3-5 分钟短视频，按课标章节循序更新，配套资料免费提供。</p>
        <p style="margin-top:12px;color:var(--muted);font-size:.9rem">口号：${s.slogan}</p>
      </div>
      <div style="margin-top:20px"><a class="btn" href="videos.html">开始学习</a></div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', footerHTML());
}

async function init(page){
  try{
    await loadData();
    ({home:renderHome,videos:renderVideos,resources:renderResources,about:renderAbout}[page])();
  }catch(e){
    document.getElementById('app').innerHTML = `<div class="wrap section"><div class="empty">页面加载失败：${e.message}<br>请确认 content.json 可访问</div></div>`;
  }
}
