const token = localStorage.getItem('teacherToken');
const role = localStorage.getItem('role');
const username = localStorage.getItem('username');

const welcomeEl = document.getElementById('welcome');
const refreshBtn = document.getElementById('refreshBtn');
const clearBtn = document.getElementById('clearBtn');
const logoutBtn = document.getElementById('logoutBtn');
const worksEl = document.getElementById('works');
const msgEl = document.getElementById('msg');
const tabBtns = document.querySelectorAll('.tab-btn');
const submissionBox = document.getElementById('submissionBox');
const submissionWrapper = document.getElementById('submissionWrapper'); 

// 【新增】获取活动二演示面板元素
const tA2Panel = document.getElementById('teacherActivity2Panel');
const tA2Canvas = document.getElementById('teacherA2Canvas');
const tA2Ctx = tA2Canvas ? tA2Canvas.getContext('2d') : null;
const tA2AutoBtn = document.getElementById('teacherA2AutoBtn');
const tA2ResetBtn = document.getElementById('teacherA2ResetBtn');

if (!token || role !== 'teacher') {
  location.href = '/login.html';
}

// =====================
// 【新增】初始化图片放大灯箱 (Lightbox)
// =====================
let lightboxOverlay = document.getElementById('lightbox-overlay');
if (!lightboxOverlay) {
  lightboxOverlay = document.createElement('div');
  lightboxOverlay.id = 'lightbox-overlay';
  lightboxOverlay.className = 'lightbox-overlay';
  lightboxOverlay.innerHTML = `
    <span class="lightbox-close">&times;</span>
    <img src="" alt="大图" />
  `;
  document.body.appendChild(lightboxOverlay);

  lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay || e.target.classList.contains('lightbox-close')) {
      lightboxOverlay.classList.remove('active');
    }
  });
}

window.openLightbox = function(src) {
  const img = lightboxOverlay.querySelector('img');
  img.src = src;
  lightboxOverlay.classList.add('active');
};
// ==========================================

let currentActivity = Number(localStorage.getItem('teacherCurrentActivity')) || 1;
let pollInterval = null; 

const activityMap = { 1: '活动一', 2: '活动二', 3: '活动三' };
const taskMap = { 1: '任务一', 2: '任务二' };
const colorMap = { '红色': '#ef4444', '紫色': '#a855f7', '蓝色': '#3b82f6', '绿色': '#22c55e', '黄色': '#eab308' };

if(welcomeEl) welcomeEl.textContent = `当前账号：${username}`;

// =====================
// 【新增】教师端活动二画布逻辑
// =====================
const T_GRID = 40;
let tA2State = {
  width: 0, height: 0, A: null, B: null,
  angle: 0, animating: false, rafId: null, trailB: []
};

function tRotatePoint(p, c, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad); const sin = Math.sin(rad);
  const dx = p.x - c.x; const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

function tDrawGrid(ctx, w, h) {
  ctx.save(); ctx.strokeStyle = '#dbe7f3'; ctx.lineWidth = 1; ctx.setLineDash([]);
  for (let x = 0; x <= w; x += T_GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += T_GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
}

function tDrawPoint(ctx, p, label, color, offsetX = 10, offsetY = -10) {
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1f2d3d'; ctx.font = 'bold 18px sans-serif'; 
  ctx.fillText(label, p.x + offsetX, p.y + offsetY); 
  ctx.restore();
}

function resizeTeacherA2Canvas() {
  if (!tA2Canvas || !tA2Ctx) return;
  const rect = tA2Canvas.getBoundingClientRect();
  tA2Canvas.width = rect.width; tA2Canvas.height = rect.height;
  tA2State.width = tA2Canvas.width; tA2State.height = tA2Canvas.height;
  
  const cx = Math.round(tA2State.width / 2 / T_GRID) * T_GRID;
  const cy = Math.round(tA2State.height / 2 / T_GRID) * T_GRID;
  tA2State.A = { x: cx, y: cy }; 
  tA2State.B = { x: cx + 4 * T_GRID, y: cy }; 
  tA2State.angle = 0; tA2State.trailB = [];
  drawTeacherA2();
}

function drawTeacherA2() {
  if (!tA2Ctx) return;
  const ctx = tA2Ctx;
  ctx.clearRect(0, 0, tA2State.width, tA2State.height);
  ctx.fillStyle = '#f8fbff'; ctx.fillRect(0, 0, tA2State.width, tA2State.height);
  tDrawGrid(ctx, tA2State.width, tA2State.height);

  const A = tA2State.A;
  const B = tA2State.B;
  const currentB = tRotatePoint(B, A, tA2State.angle);

  // 1. 原线段 AB (虚线)
  ctx.save();
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  ctx.restore();

  // 2. B点轨迹
  if (tA2State.trailB.length > 1) {
    ctx.save(); ctx.strokeStyle = 'rgba(39, 174, 96, 0.6)'; ctx.lineWidth = 3; ctx.setLineDash([]);
    ctx.beginPath();
    tA2State.trailB.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke(); ctx.restore();
  }

  // 3. 旋转后的线段 AB' (实线)
  ctx.save();
  ctx.strokeStyle = '#2d6cdf'; ctx.lineWidth = 4; ctx.setLineDash([]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(currentB.x, currentB.y); ctx.stroke();
  ctx.restore();

  // 4. 绘制点和标签
  tDrawPoint(ctx, A, 'A', '#e74c3c', -25, 20); 
  tDrawPoint(ctx, B, 'B', '#94a3b8', 10, 20);  
  
  // B' 标签，旋转开始后显示
  if (tA2State.angle !== 0 || !tA2State.animating) {
     let offX = 10, offY = -10;
     if (tA2State.angle <= -45) { offX = -30; offY = 5; } 
     tDrawPoint(ctx, currentB, "B'", '#2d6cdf', offX, offY);
  }
}

function startTeacherA2Animation() {
  if (tA2State.animating) return;
  tA2State.angle = 0; tA2State.trailB = []; tA2State.animating = true;
  
  const step = () => {
    tA2State.angle -= 2; // 逆时针旋转（Y轴向下时为负值）
    const currentB = tRotatePoint(tA2State.B, tA2State.A, tA2State.angle);
    tA2State.trailB.push({ x: currentB.x, y: currentB.y });
    drawTeacherA2();
    
    if (tA2State.angle <= -90) {
      tA2State.angle = -90;
      const finalB = tRotatePoint(tA2State.B, tA2State.A, -90);
      tA2State.trailB.push({ x: finalB.x, y: finalB.y });
      drawTeacherA2();
      tA2State.animating = false;
      cancelAnimationFrame(tA2State.rafId); tA2State.rafId = null;
      return;
    }
    tA2State.rafId = requestAnimationFrame(step);
  };
  tA2State.rafId = requestAnimationFrame(step);
}

function resetTeacherA2() {
  if (tA2State.rafId) cancelAnimationFrame(tA2State.rafId);
  tA2State.animating = false; tA2State.angle = 0; tA2State.trailB = [];
  drawTeacherA2();
}

if (tA2AutoBtn) tA2AutoBtn.addEventListener('click', startTeacherA2Animation);
if (tA2ResetBtn) tA2ResetBtn.addEventListener('click', resetTeacherA2);
window.addEventListener('resize', () => { if(currentActivity === 2) resizeTeacherA2Canvas(); });
// ==========================================

function updateActivityUI() {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.activity) === currentActivity);
  });
  localStorage.setItem('teacherCurrentActivity', String(currentActivity));

  if (submissionWrapper) {
    submissionWrapper.style.display = currentActivity === 3 ? 'block' : 'none';
  }

  // 【新增】控制活动二演示面板的显示与初始化
  if (tA2Panel) {
    tA2Panel.style.display = currentActivity === 2 ? 'block' : 'none';
    if (currentActivity === 2) {
      setTimeout(resizeTeacherA2Canvas, 50);
    }
  }
}

async function fetchWorks(silent = false) {
  if (!silent && msgEl) msgEl.textContent = '';
  try {
    const res = await fetch(`/api/works?activity=${currentActivity}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) {
      if (!silent && msgEl) msgEl.textContent = data.message || '获取作品失败';
      if (!silent && worksEl) worksEl.innerHTML = '';
      return;
    }
    renderWorks(data);
  } catch (err) {
    if (!silent && msgEl) msgEl.textContent = '网络错误';
  }
}

async function fetchSubmissions(silent = false) {
  if (currentActivity !== 3) return;
  try {
    const res = await fetch(`/api/teacher/submissions?activity=3`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) {
      if (!silent && submissionBox) submissionBox.innerHTML = data.message || '获取提交失败';
      return;
    }
    renderSubmissions(data.submissions || []);
  } catch (err) {
    if (!silent && submissionBox) submissionBox.innerHTML = '网络错误';
  }
}

function renderSubmissions(list) {
  if (!submissionBox) return;
  if (!list.length) {
    submissionBox.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#94a3b8; padding:20px;">暂无提交</p>';
    return;
  }

  submissionBox.innerHTML = list.map(item => {
    const starsCount = item.stars ? item.stars.length : 0;
    const imageHtml = item.imageUrl 
      ? `<img class="work-image" src="${item.imageUrl}" alt="活动三截图" title="点击放大" onclick="openLightbox(this.src)" />` 
      : '<div style="height:100px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:13px; background:#f8fafc; border-radius:12px; margin-bottom:12px;">(未包含截图)</div>';

    return `
      <div class="work-card">
        <div class="meta">
          <span>👤 ${item.studentName || item.studentUsername}</span>
          <span>👥 ${item.groupName || '未分组'}</span>
          <span>📄 第 ${item.page} 页</span>
        </div>
        ${imageHtml}
        <div style="font-size:13px; color:#475569; line-height:1.8; margin-bottom:8px;">
          <div>🎯 中心: <strong>${item.centerChoice}</strong> | 🔄 角度: <strong>${item.currentAngle}°</strong></div>
          <div>⭐ 星星: <strong>${starsCount}</strong> | 📍 O点: <strong>${item.hasOPoint && item.oPoint ? `(${item.oPoint.x}, ${item.oPoint.y})` : '无'}</strong></div>
        </div>
        <div style="font-size:12px; color:#94a3b8; margin-top:auto; padding-top:8px; border-top: 1px dashed #e5edf2;">
          ⏰ ${item.submittedAt || ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderWorks(list) {
  if (!worksEl) return;
  worksEl.innerHTML = '';

  if (currentActivity === 3) {
    worksEl.innerHTML = `<p style="color:#64748b; text-align: center; padding: 20px;">活动三的截图和状态已显示在上方的专属区域中。</p>`;
    fetchSubmissions();
    return;
  }

  if (!list.length) {
    worksEl.innerHTML = `<p style="color:#64748b; text-align: center; padding: 20px;">当前 ${activityMap[currentActivity]} 暂无作品</p>`;
    return;
  }

  if (currentActivity === 1) {
    renderActivity1Works(list);
  } else {
    renderOtherActivityWorks(list);
  }
}

function renderActivity1Works(list) {
  const task1 = list.filter(w => Number(w.task) === 1);
  const task2 = list.filter(w => Number(w.task) === 2);
  renderTaskSection('任务一作品', task1);
  renderTaskSection('任务二作品', task2);
}

function renderTaskSection(title, works) {
  const section = document.createElement('div');
  section.className = 'work-section';
  const titleEl = document.createElement('h3');
  titleEl.className = 'section-title';
  titleEl.textContent = title;
  section.appendChild(titleEl);

  if (!works.length) {
    const empty = document.createElement('p');
    empty.textContent = '暂无作品';
    empty.style.color = '#94a3b8';
    section.appendChild(empty);
    worksEl.appendChild(section);
    return;
  }

  works.forEach(work => { section.appendChild(createWorkCard(work, true)); });
  worksEl.appendChild(section);
}

function renderOtherActivityWorks(list) {
  list.forEach(work => { worksEl.appendChild(createWorkCard(work, false)); });
}

function createWorkCard(work, isActivity1) {
  const card = document.createElement('div');
  card.className = 'work-card';

  const metaHtml = isActivity1
    ? `<span>活动一</span><span>${taskMap[work.task] || '未知任务'}</span><span>👥 ${work.groupName || '未分组'}</span><span>👤 ${work.studentName || work.studentUsername}</span>`
    : `<span>${activityMap[work.activity] || '未知活动'}</span><span>👥 ${work.groupName || '未分组'}</span><span>👤 ${work.studentName || work.studentUsername}</span>`;

  let answersHtml = '';
  if (work.activity === 2 && work.answers && Array.isArray(work.answers)) {
    answersHtml = `
      <div style="margin-bottom: 12px; padding: 10px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13px; line-height: 1.8; color: #475569;">
        <strong style="color:#334155;">📝 旋转过程：</strong>
        <ul style="margin: 4px 0 0; padding-left: 18px;">
          ${work.answers.map((ans, i) => {
            const colorStyle = colorMap[ans.color] || '#334155';
            return `<li>以 <strong style="color:#2563eb;">${ans.center || '?'}</strong> 为中心，<strong>${ans.direction || '?'}</strong> 转 <strong style="color:#d97706;">${ans.angle || '?'}</strong>° 碰 <strong style="color:${colorStyle};">${ans.color || '?'}</strong> 星。</li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }

  const imageHtml = work.imageUrl 
    ? `<img class="work-image" src="${work.imageUrl}" alt="作品图片" title="点击放大" onclick="openLightbox(this.src)" />` 
    : '';

  card.innerHTML = `
    <div class="meta">${metaHtml}</div>
    ${imageHtml}
    ${answersHtml}
    ${work.title ? `<h3 style="font-size:16px; color:#35515f; margin:0 0 8px;">${work.title}</h3>` : ''}
    ${work.content ? `<p style="font-size:14px; color:#475569; margin:0 0 12px; flex:1;">${work.content}</p>` : ''}
    <div style="font-size:12px; color:#94a3b8; margin-bottom:8px;">⏰ ${work.createdAt || ''}</div>
    <div class="action-row">
      <button class="btn danger" data-id="${work.id}">删除</button>
    </div>
  `;

  const deleteBtn = card.querySelector('button[data-id]');
  deleteBtn.addEventListener('click', async () => {
    if (confirm('确定删除该作品吗？')) { await deleteWork(work.id); }
  });

  return card;
}

async function deleteWork(id) {
  try {
    const res = await fetch(`/api/works/${id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) { if(msgEl) msgEl.textContent = data.message || '删除失败'; return; }
    if(msgEl) msgEl.textContent = data.message || '删除成功';
    fetchWorks();
  } catch (err) { if(msgEl) msgEl.textContent = '网络错误'; }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    fetchWorks(true); 
    if (currentActivity === 3) fetchSubmissions(true);
  }, 3000); 
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentActivity = Number(btn.dataset.activity);
    updateActivityUI();
    fetchWorks(); 
  });
});

if(refreshBtn) refreshBtn.addEventListener('click', () => fetchWorks());

if(clearBtn) {
  clearBtn.addEventListener('click', async () => {
    if (currentActivity === 3) {
      if (!confirm('确定清空活动三的所有提交记录吗？')) return;
      try {
        const res = await fetch(`/api/teacher/submissions?activity=3`, {
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) { if(msgEl) msgEl.textContent = data.message || '清空失败'; return; }
        if(msgEl) msgEl.textContent = data.message || '清空成功';
        fetchSubmissions();
      } catch (err) { if(msgEl) msgEl.textContent = '网络错误'; }
      return;
    }

    if (!confirm(`确定清空 ${activityMap[currentActivity]} 的所有作品吗？`)) return;
    try {
      const res = await fetch(`/api/works?activity=${currentActivity}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) { if(msgEl) msgEl.textContent = data.message || '清空失败'; return; }
      if(msgEl) msgEl.textContent = data.message || '清空成功';
      fetchWorks();
    } catch (err) { if(msgEl) msgEl.textContent = '网络错误'; }
  });
}

if(logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('teacherCurrentActivity');
    if (pollInterval) clearInterval(pollInterval);
    location.href = '/login.html';
  });
}

updateActivityUI();
fetchWorks();
startPolling();
