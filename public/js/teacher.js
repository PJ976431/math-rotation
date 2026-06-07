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
const toggleA3CanvasBtn = document.getElementById('toggleA3CanvasBtn');

const tA2Panel = document.getElementById('teacherActivity2Panel');
const tA2Canvas = document.getElementById('teacherA2Canvas');
const tA2Ctx = tA2Canvas ? tA2Canvas.getContext('2d') : null;

const tA3Panel = document.getElementById('teacherActivity3Panel');
const tA3Canvas = document.getElementById('teacherA3Canvas');
const tA3Ctx = tA3Canvas ? tA3Canvas.getContext('2d') : null;
const tA3Msg = document.getElementById('tA3Msg');

if (!token || role !== 'teacher') location.href = '/login.html';

// ===================== 图片放大灯箱 =====================
let lightboxOverlay = document.getElementById('lightbox-overlay');
if (!lightboxOverlay) {
  lightboxOverlay = document.createElement('div');
  lightboxOverlay.id = 'lightbox-overlay';
  lightboxOverlay.className = 'lightbox-overlay';
  lightboxOverlay.innerHTML = `<span class="lightbox-close">&times;</span><img src="" alt="大图" />`;
  document.body.appendChild(lightboxOverlay);
  lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay || e.target.classList.contains('lightbox-close')) lightboxOverlay.classList.remove('active');
  });
}
window.openLightbox = function(src) {
  lightboxOverlay.querySelector('img').src = src;
  lightboxOverlay.classList.add('active');
};

let currentActivity = Number(localStorage.getItem('teacherCurrentActivity')) || 1;
let pollInterval = null; 
const activityMap = { 1: '任务一', 2: '任务二', 3: '任务三', 4: '综合练习' };
const taskMap = { 1: '任务一', 2: '任务二' };
if(welcomeEl) welcomeEl.textContent = `当前账号：${username}`;

// ===================== 任务二：星星提示交互 =====================
document.querySelectorAll('.star-hint-item').forEach(item => {
  item.addEventListener('click', () => {
    const starIcon = item.querySelector('.star-icon');
    const hintEl = item.querySelector('.star-hint-text');
    
    const isShowing = hintEl.classList.contains('show');
    if (isShowing) {
      hintEl.classList.remove('show');
      starIcon.classList.remove('active');
    } else {
      hintEl.classList.add('show');
      starIcon.classList.add('active');
    }
  });
});

// ===================== 任务三：学生画布切换 =====================
toggleA3CanvasBtn?.addEventListener('click', () => {
  const isShowingCanvas = tA3Panel.style.display === 'block';
  if (isShowingCanvas) {
    tA3Panel.style.display = 'none';
    submissionWrapper.style.display = 'block';
    worksEl.style.display = 'block';
    toggleA3CanvasBtn.textContent = '学生画布';
  } else {
    tA3Panel.style.display = 'block';
    submissionWrapper.style.display = 'none';
    worksEl.style.display = 'none';
    toggleA3CanvasBtn.textContent = '查看作品';
    setTimeout(resizeTeacherA3Canvas, 50);
  }
});

// ===================== 通用绘图函数 =====================
const GRID = 40;
const STAR_COLORS = ['#ff5d8f', '#7c5cff', '#4cc9f0', '#f9c74f', '#43aa8b'];

function normalizeAngleDiff(diff) {
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}
function rotatePoint(p, c, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad); const sin = Math.sin(rad);
  const dx = p.x - c.x; const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}
function drawGrid(ctx, w, h) {
  ctx.save(); ctx.strokeStyle = '#dbe7f3'; ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
}
function drawStarShape(ctx, x, y, color) {
  const spikes = 5, outerRadius = 12, innerRadius = 5;
  let rot = Math.PI / 2 * 3; const step = Math.PI / spikes;
  ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.moveTo(0, -outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius); rot += step;
    ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius); rot += step;
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = 6; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke(); ctx.restore();
}
function drawPoint(ctx, p, label, color) {
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1f2d3d'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(label, p.x + 10, p.y - 10); ctx.restore();
}
function drawCenter(ctx, c, label = '', color = '#27ae60') {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, Math.PI * 2); ctx.fill();
  if (label) { ctx.fillStyle = color; ctx.font = 'bold 15px sans-serif'; ctx.fillText(label, c.x + 10, c.y + 5); }
  ctx.restore();
}
function drawSegment(ctx, A, B) {
  ctx.save(); ctx.strokeStyle = '#2d6cdf'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.restore();
}
function drawTrail(ctx, points, color) {
  if (!points || points.length < 2) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
  points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke(); ctx.restore();
}
function snapToGrid(v) { return Math.round(v / GRID) * GRID; }
function snapPoint(p) { return { x: snapToGrid(p.x), y: snapToGrid(p.y) }; }

// ===================== 任务二 画布逻辑 =====================
const tA2State = {
  width: 0, height: 0, A: null, B: null, selectedCenterType: 'A', angle: 0,
  draggingLine: false, dragStartAngle: 0, dragStartObjAngle: 0,
  fixedStars: [], trails: { A: [], B: [] }, activeTrail: { A: true, B: true }, animating: false, rafId: null
};

function initTeacherA2FixedStars() {
  if (!tA2State.A || !tA2State.B) return;
  tA2State.fixedStars = [
    { x: tA2State.A.x + 3 * GRID, y: tA2State.A.y - 3 * GRID, color: '#43aa8b' }, 
    { x: tA2State.A.x - 3 * GRID, y: tA2State.A.y, color: '#7c5cff' },             
    { x: tA2State.A.x, y: tA2State.A.y + 3 * GRID, color: '#4cc9f0' }              
  ];
}

function resizeTeacherA2Canvas() {
  if (!tA2Canvas || !tA2Ctx) return;
  const rect = tA2Canvas.getBoundingClientRect();
  tA2Canvas.width = rect.width; tA2Canvas.height = rect.height;
  tA2State.width = tA2Canvas.width; tA2State.height = tA2Canvas.height;
  const cx = Math.round(tA2State.width / 2 / GRID) * GRID;
  const cy = Math.round(tA2State.height / 2 / GRID) * GRID;
  tA2State.A = { x: cx, y: cy }; 
  tA2State.B = { x: cx + 3 * GRID, y: cy }; 
  initTeacherA2FixedStars(); drawTeacherA2();
}

function drawTeacherA2() {
  if (!tA2Ctx) return;
  tA2Ctx.clearRect(0, 0, tA2State.width, tA2State.height);
  tA2Ctx.fillStyle = '#f8fbff'; tA2Ctx.fillRect(0, 0, tA2State.width, tA2State.height);
  drawGrid(tA2Ctx, tA2State.width, tA2State.height);
  const center = tA2State.selectedCenterType === 'A' ? tA2State.A : tA2State.B;
  const A = rotatePoint(tA2State.A, center, tA2State.angle);
  const B = rotatePoint(tA2State.B, center, tA2State.angle);
  drawTrail(tA2Ctx, tA2State.trails.A, 'rgba(231, 76, 60, 0.45)');
  drawTrail(tA2Ctx, tA2State.trails.B, 'rgba(39, 174, 96, 0.45)');
  drawSegment(tA2Ctx, A, B);
  drawPoint(tA2Ctx, A, 'A', '#e74c3c'); drawPoint(tA2Ctx, B, 'B', '#e74c3c');
  drawCenter(tA2Ctx, center, '', '#27ae60'); 
  tA2State.fixedStars.forEach(s => drawStarShape(tA2Ctx, s.x, s.y, s.color));
  tA2Canvas.style.cursor = tA2State.animating ? 'wait' : 'grab';
}

function resetTeacherA2() {
  if (tA2State.rafId) cancelAnimationFrame(tA2State.rafId);
  tA2State.animating = false; tA2State.angle = 0; tA2State.selectedCenterType = 'A';
  tA2State.draggingLine = false; 
  document.querySelector('input[name="tA2CenterChoice"][value="A"]').checked = true;
  drawTeacherA2();
}

function startTeacherA2AutoRun() {
  if (tA2State.animating) return;
  tA2State.angle = 0; 
  tA2State.animating = true;
  const step = () => {
    tA2State.angle += 2; 
    const center = tA2State.selectedCenterType === 'A' ? tA2State.A : tA2State.B;
    const A = rotatePoint(tA2State.A, center, tA2State.angle);
    const B = rotatePoint(tA2State.B, center, tA2State.angle);
    if (tA2State.activeTrail.A) tA2State.trails.A.push({ x: A.x, y: A.y });
    if (tA2State.activeTrail.B) tA2State.trails.B.push({ x: B.x, y: B.y });
    drawTeacherA2();
    if (tA2State.angle >= 360) { tA2State.angle = 360; tA2State.animating = false; cancelAnimationFrame(tA2State.rafId); drawTeacherA2(); return; }
    tA2State.rafId = requestAnimationFrame(step);
  };
  tA2State.rafId = requestAnimationFrame(step);
}

document.querySelectorAll('input[name="tA2CenterChoice"]').forEach(r => r.addEventListener('change', () => { 
  tA2State.selectedCenterType = document.querySelector('input[name="tA2CenterChoice"]:checked').value; 
  tA2State.angle = 0; drawTeacherA2(); 
}));
document.getElementById('tA2TrailA')?.addEventListener('change', (e) => { tA2State.activeTrail.A = e.target.checked; });
document.getElementById('tA2TrailB')?.addEventListener('change', (e) => { tA2State.activeTrail.B = e.target.checked; });
document.getElementById('tA2ClearTrailBtn')?.addEventListener('click', () => { tA2State.trails = { A: [], B: [] }; drawTeacherA2(); });
document.getElementById('tA2ResetBtn')?.addEventListener('click', resetTeacherA2);
document.getElementById('tA2AutoRunBtn')?.addEventListener('click', startTeacherA2AutoRun);

if (tA2Canvas) {
  tA2Canvas.style.touchAction = 'none';
  tA2Canvas.addEventListener('pointerdown', (e) => {
    if (tA2State.animating) return; e.preventDefault(); 
    const rect = tA2Canvas.getBoundingClientRect(); const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const center = tA2State.selectedCenterType === 'A' ? tA2State.A : tA2State.B;
    const A = rotatePoint(tA2State.A, center, tA2State.angle); const B = rotatePoint(tA2State.B, center, tA2State.angle);
    if (Math.hypot(A.x - p.x, A.y - p.y) < 35 || Math.hypot(B.x - p.x, B.y - p.y) < 35) {
      tA2State.draggingLine = true; tA2State.dragStartAngle = Math.atan2(p.y - center.y, p.x - center.x); tA2State.dragStartObjAngle = tA2State.angle;
    }
  });
  tA2Canvas.addEventListener('pointermove', (e) => {
    if (!tA2State.draggingLine || tA2State.animating) return; e.preventDefault(); 
    const rect = tA2Canvas.getBoundingClientRect(); const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const center = tA2State.selectedCenterType === 'A' ? tA2State.A : tA2State.B;
    let delta = normalizeAngleDiff(Math.atan2(p.y - center.y, p.x - center.x) - tA2State.dragStartAngle);
    tA2State.angle = tA2State.dragStartObjAngle + delta * 180 / Math.PI; 
    const A = rotatePoint(tA2State.A, center, tA2State.angle); const B = rotatePoint(tA2State.B, center, tA2State.angle);
    if (tA2State.activeTrail.A) tA2State.trails.A.push({ x: A.x, y: A.y });
    if (tA2State.activeTrail.B) tA2State.trails.B.push({ x: B.x, y: B.y });
    drawTeacherA2();
  });
  tA2Canvas.addEventListener('pointerup', () => { tA2State.draggingLine = false; });
  tA2Canvas.addEventListener('pointerleave', () => { tA2State.draggingLine = false; });
}

// ===================== 任务三 画布逻辑 =====================
const tA3State = {
  width: 0, height: 0, center: null, A: null, B: null, O: null, hasO: false,
  selectedCenterType: 'A', angle: 0, animating: false, rafId: null, mode: 'star',
  stars: [], draggingStarIndex: -1, dragOffsetX: 0, dragOffsetY: 0,
  draggingLine: false, draggingO: false, lineDragOffset: { x: 0, y: 0 },
  dragStartAngle: 0, dragStartObjAngle: 0,
  trails: { A: [], B: [], O: [], seg: [] }, 
  activeTrail: { A: false, B: false, O: false, seg: false }, 
  page: 1, awaitingOPlacement: false
};

function resizeTeacherA3Canvas() {
  if (!tA3Canvas || !tA3Ctx) return;
  const rect = tA3Canvas.getBoundingClientRect();
  tA3Canvas.width = rect.width; tA3Canvas.height = rect.height;
  tA3State.width = tA3Canvas.width; tA3State.height = tA3Canvas.height;
  const cx = Math.round(tA3State.width / 2 / GRID) * GRID; const cy = Math.round(tA3State.height / 2 / GRID) * GRID;
  tA3State.center = { x: cx, y: cy }; tA3State.A = { x: cx - 2 * GRID, y: cy }; tA3State.B = { x: cx + 2 * GRID, y: cy };
  if (!tA3State.O) tA3State.O = { x: cx, y: cy - 2 * GRID };
  drawTeacherA3();
}

function drawTeacherA3() {
  if (!tA3Ctx) return;
  tA3Ctx.clearRect(0, 0, tA3State.width, tA3State.height);
  tA3Ctx.fillStyle = '#f8fbff'; tA3Ctx.fillRect(0, 0, tA3State.width, tA3State.height);
  drawGrid(tA3Ctx, tA3State.width, tA3State.height);
  const center = tA3State.selectedCenterType === 'A' ? tA3State.A : (tA3State.selectedCenterType === 'B' ? tA3State.B : tA3State.O);
  const A = rotatePoint(tA3State.A, center, tA3State.angle); const B = rotatePoint(tA3State.B, center, tA3State.angle);
  drawTrail(tA3Ctx, tA3State.trails.A, 'rgba(231, 76, 60, 0.45)'); drawTrail(tA3Ctx, tA3State.trails.B, 'rgba(39, 174, 96, 0.45)');
  if (tA3State.trails.seg.length > 0) {
    tA3Ctx.save(); tA3Ctx.strokeStyle = 'rgba(45, 108, 223, 0.22)'; tA3Ctx.lineWidth = 3;
    tA3State.trails.seg.forEach(pair => { tA3Ctx.beginPath(); tA3Ctx.moveTo(pair.A.x, pair.A.y); tA3Ctx.lineTo(pair.B.x, pair.B.y); tA3Ctx.stroke(); });
    tA3Ctx.restore();
  }
  drawSegment(tA3Ctx, A, B); drawPoint(tA3Ctx, A, 'A', '#e74c3c'); drawPoint(tA3Ctx, B, 'B', '#e74c3c');
  if (tA3State.page === 2 && tA3State.hasO) drawCenter(tA3Ctx, tA3State.O, 'O点', '#f472b6');
  drawCenter(tA3Ctx, center, '', '#27ae60'); 
  tA3State.stars.forEach((s, i) => drawStarShape(tA3Ctx, s.x, s.y, STAR_COLORS[i % STAR_COLORS.length]));
  tA3Canvas.style.cursor = tA3State.mode === 'star' ? 'crosshair' : 'grab';
}

function setTeacherA3Page(page) {
  tA3State.page = page;
  if (page === 2) {
    if (tA3State.rafId) cancelAnimationFrame(tA3State.rafId);
    tA3State.angle = 0; tA3State.stars = []; tA3State.trails = { A: [], B: [], O: [], seg: [] }; 
    tA3State.hasO = false; tA3State.awaitingOPlacement = false; tA3State.mode = 'line'; tA3State.selectedCenterType = 'A';
    document.querySelector('input[name="tA3CenterChoice"][value="A"]').checked = true;
  } else {
    tA3State.mode = 'star'; tA3State.selectedCenterType = 'A';
    document.querySelector('input[name="tA3CenterChoice"][value="A"]').checked = true;
  }
  
  tA3State.activeTrail = { A: false, B: false, O: false, seg: false };
  const trailA = document.getElementById('tA3TrailA'); if(trailA) trailA.checked = false;
  const trailB = document.getElementById('tA3TrailB'); if(trailB) trailB.checked = false;
  const trailSeg = document.getElementById('tA3TrailSeg'); if(trailSeg) trailSeg.checked = false;

  document.getElementById('tA3Page2Tools').style.display = page === 2 ? 'flex' : 'none';
  document.getElementById('tA3PrevBtn').style.display = page === 1 ? 'none' : 'inline-block';
  document.getElementById('tA3NextBtn').style.display = page === 2 ? 'none' : 'inline-block';
  document.getElementById('tA3OCenterWrap').style.display = 'none';
  if(tA3Msg) tA3Msg.textContent = ''; drawTeacherA3();
}

function startTeacherA3Animation() {
  if (tA3State.animating) return;
  if (tA3State.selectedCenterType === 'O' && !tA3State.hasO) { if(tA3Msg) tA3Msg.textContent = '请先添加 O 点'; return; }
  tA3State.angle = 0; tA3State.animating = true;
  const step = () => {
    tA3State.angle += 2;
    const center = tA3State.selectedCenterType === 'A' ? tA3State.A : (tA3State.selectedCenterType === 'B' ? tA3State.B : tA3State.O);
    const A = rotatePoint(tA3State.A, center, tA3State.angle); const B = rotatePoint(tA3State.B, center, tA3State.angle);
    if (tA3State.activeTrail.A) tA3State.trails.A.push({ x: A.x, y: A.y });
    if (tA3State.activeTrail.B) tA3State.trails.B.push({ x: B.x, y: B.y });
    if (tA3State.activeTrail.seg) tA3State.trails.seg.push({ A: { ...A }, B: { ...B } });
    drawTeacherA3();
    if (tA3State.angle >= 360) { tA3State.angle = 360; tA3State.animating = false; cancelAnimationFrame(tA3State.rafId); drawTeacherA3(); return; }
    tA3State.rafId = requestAnimationFrame(step);
  };
  tA3State.rafId = requestAnimationFrame(step);
}

function resetTeacherA3() {
  if (tA3State.rafId) cancelAnimationFrame(tA3State.rafId);
  tA3State.animating = false; tA3State.angle = 0; tA3State.mode = 'star'; tA3State.stars = [];
  tA3State.trails = { A: [], B: [], O: [], seg: [] }; tA3State.selectedCenterType = 'A'; tA3State.hasO = false;
  
  tA3State.activeTrail = { A: false, B: false, O: false, seg: false };
  const trailA = document.getElementById('tA3TrailA'); if(trailA) trailA.checked = false;
  const trailB = document.getElementById('tA3TrailB'); if(trailB) trailB.checked = false;
  const trailSeg = document.getElementById('tA3TrailSeg'); if(trailSeg) trailSeg.checked = false;

  document.querySelector('input[name="tA3CenterChoice"][value="A"]').checked = true;
  if(tA3Msg) tA3Msg.textContent = '已恢复到初始状态'; drawTeacherA3();
}

document.querySelectorAll('input[name="tA3CenterChoice"]').forEach(r => r.addEventListener('change', () => { 
  tA3State.selectedCenterType = document.querySelector('input[name="tA3CenterChoice"]:checked').value; tA3State.angle = 0; drawTeacherA3(); 
}));
document.getElementById('tA3TrailA')?.addEventListener('change', (e) => { tA3State.activeTrail.A = e.target.checked; });
document.getElementById('tA3TrailB')?.addEventListener('change', (e) => { tA3State.activeTrail.B = e.target.checked; });
document.getElementById('tA3TrailSeg')?.addEventListener('change', (e) => { tA3State.activeTrail.seg = e.target.checked; });
document.getElementById('tA3ModeStarBtn')?.addEventListener('click', () => { tA3State.mode = 'star'; drawTeacherA3(); });
document.getElementById('tA3ModeLineBtn')?.addEventListener('click', () => { tA3State.mode = 'line'; drawTeacherA3(); });
document.getElementById('tA3ClearTrailBtn')?.addEventListener('click', () => { tA3State.trails = { A: [], B: [], O: [], seg: [] }; drawTeacherA3(); });
document.getElementById('tA3AutoRunBtn')?.addEventListener('click', startTeacherA3Animation);
document.getElementById('tA3ResetBtn')?.addEventListener('click', resetTeacherA3);
document.getElementById('tA3AddOBtn')?.addEventListener('click', () => { tA3State.awaitingOPlacement = true; tA3State.mode = 'line'; if(tA3Msg) tA3Msg.textContent = '请点击网格点放置 O 点'; drawTeacherA3(); });
document.getElementById('tA3PrevBtn')?.addEventListener('click', () => setTeacherA3Page(1));
document.getElementById('tA3NextBtn')?.addEventListener('click', () => setTeacherA3Page(2));

if (tA3Canvas) {
  tA3Canvas.style.touchAction = 'none';
  tA3Canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault(); const rect = tA3Canvas.getBoundingClientRect(); const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (tA3State.page === 2 && tA3State.awaitingOPlacement) {
      tA3State.O = snapPoint(p); tA3State.hasO = true; tA3State.awaitingOPlacement = false; tA3State.selectedCenterType = 'O';
      document.querySelector('input[name="tA3CenterChoice"][value="O"]').checked = true; drawTeacherA3(); return;
    }
    if (tA3State.mode === 'star') {
      const gridP = snapPoint(p);
      const idx = tA3State.stars.findIndex(s => Math.hypot(s.x - gridP.x, s.y - gridP.y) < 35);
      if (idx >= 0) { tA3State.draggingStarIndex = idx; tA3State.dragOffsetX = tA3State.stars[idx].x - gridP.x; tA3State.dragOffsetY = tA3State.stars[idx].y - gridP.y; }
      else { if (tA3State.stars.length >= 5) return; tA3State.stars.push({ x: gridP.x, y: gridP.y }); tA3State.draggingStarIndex = tA3State.stars.length - 1; tA3State.dragOffsetX = 0; tA3State.dragOffsetY = 0; }
      drawTeacherA3(); return;
    }
    if (tA3State.mode === 'line') {
      const center = tA3State.selectedCenterType === 'A' ? tA3State.A : (tA3State.selectedCenterType === 'B' ? tA3State.B : tA3State.O);
      const A = rotatePoint(tA3State.A, center, tA3State.angle); const B = rotatePoint(tA3State.B, center, tA3State.angle);
      if (tA3State.page === 2 && tA3State.hasO && Math.hypot(tA3State.O.x - p.x, tA3State.O.y - p.y) < 35) {
        tA3State.draggingO = true; tA3State.lineDragOffset = { x: p.x - tA3State.O.x, y: p.y - tA3State.O.y }; return;
      }
      if (Math.hypot(A.x - p.x, A.y - p.y) < 35 || Math.hypot(B.x - p.x, B.y - p.y) < 35) {
        tA3State.draggingLine = true; tA3State.dragStartAngle = Math.atan2(p.y - center.y, p.x - center.x); tA3State.dragStartObjAngle = tA3State.angle;
      }
    }
  });
  tA3Canvas.addEventListener('pointermove', (e) => {
    e.preventDefault(); const rect = tA3Canvas.getBoundingClientRect(); const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (tA3State.mode === 'star' && tA3State.draggingStarIndex >= 0) {
      tA3State.stars[tA3State.draggingStarIndex] = snapPoint({ x: p.x + tA3State.dragOffsetX, y: p.y + tA3State.dragOffsetY }); drawTeacherA3(); return;
    }
    if (tA3State.mode === 'line' && tA3State.draggingO && tA3State.page === 2 && tA3State.hasO) {
      tA3State.O = snapPoint({ x: p.x - tA3State.lineDragOffset.x, y: p.y - tA3State.lineDragOffset.y });
      tA3State.selectedCenterType = 'O'; document.querySelector('input[name="tA3CenterChoice"][value="O"]').checked = true; drawTeacherA3(); return;
    }
    if (tA3State.mode === 'line' && tA3State.draggingLine) {
      const center = tA3State.selectedCenterType === 'A' ? tA3State.A : (tA3State.selectedCenterType === 'B' ? tA3State.B : tA3State.O);
      let delta = normalizeAngleDiff(Math.atan2(p.y - center.y, p.x - center.x) - tA3State.dragStartAngle);
      tA3State.angle = tA3State.dragStartObjAngle + delta * 180 / Math.PI; 
      const A = rotatePoint(tA3State.A, center, tA3State.angle); const B = rotatePoint(tA3State.B, center, tA3State.angle);
      if (tA3State.activeTrail.A) tA3State.trails.A.push({ x: A.x, y: A.y });
      if (tA3State.activeTrail.B) tA3State.trails.B.push({ x: B.x, y: B.y });
      if (tA3State.activeTrail.seg) tA3State.trails.seg.push({ A: { ...A }, B: { ...B } });
      drawTeacherA3();
    }
  });
  tA3Canvas.addEventListener('pointerup', () => { tA3State.draggingStarIndex = -1; tA3State.draggingLine = false; tA3State.draggingO = false; });
  tA3Canvas.addEventListener('pointerleave', () => { tA3State.draggingStarIndex = -1; tA3State.draggingLine = false; tA3State.draggingO = false; });
}

// ===================== 作品与提交管理逻辑 =====================
function updateActivityUI() {
  tabBtns.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.activity) === currentActivity));
  localStorage.setItem('teacherCurrentActivity', String(currentActivity));

  // 【修改】任务二专属逻辑：隐藏作品相关按钮和列表
  const isActivity2 = currentActivity === 2;
  if (refreshBtn) refreshBtn.style.display = isActivity2 ? 'none' : 'inline-block';
  if (clearBtn) clearBtn.style.display = isActivity2 ? 'none' : 'inline-block';
  if (worksEl) worksEl.style.display = isActivity2 ? 'none' : 'block';

  tA2Panel.style.display = isActivity2 ? 'block' : 'none';
  if (isActivity2) setTimeout(resizeTeacherA2Canvas, 50);

  toggleA3CanvasBtn.style.display = currentActivity === 3 ? 'inline-block' : 'none';
  if (currentActivity === 3) {
    tA3Panel.style.display = 'none';
    submissionWrapper.style.display = 'block';
    // 任务三显示作品区（用于展示提交状态）
    if(worksEl) worksEl.style.display = 'block'; 
    toggleA3CanvasBtn.textContent = '学生画布';
  } else {
    tA3Panel.style.display = 'none';
    submissionWrapper.style.display = 'none';
    // 非任务二、非任务三时，正常显示作品区
    if(worksEl && !isActivity2) worksEl.style.display = 'block';
  }
}

async function fetchWorks(silent = false) {
  if (!silent && msgEl) msgEl.textContent = '';
  try {
    const res = await fetch(`/api/works?activity=${currentActivity}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) { if (!silent && msgEl) msgEl.textContent = data.message || '获取作品失败'; if (!silent && worksEl) worksEl.innerHTML = ''; return; }
    renderWorks(data);
  } catch (err) { if (!silent && msgEl) msgEl.textContent = '网络错误'; }
}

async function fetchSubmissions(silent = false) {
  if (currentActivity !== 3) return;
  try {
    const res = await fetch(`/api/teacher/submissions?activity=3`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) { if (!silent && submissionBox) submissionBox.innerHTML = data.message || '获取提交失败'; return; }
    renderSubmissions(data.submissions || []);
  } catch (err) { if (!silent && submissionBox) submissionBox.innerHTML = '网络错误'; }
}

function renderSubmissions(list) {
  if (!submissionBox) return;
  if (!list.length) { submissionBox.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#94a3b8; padding:20px;">暂无提交</p>'; return; }
  submissionBox.innerHTML = list.map(item => {
    const starsCount = item.stars ? item.stars.length : 0;
    const imageHtml = item.imageUrl ? `<img class="work-image" src="${item.imageUrl}" alt="任务三截图" title="点击放大" onclick="openLightbox(this.src)" />` : '<div style="height:100px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:13px; background:#f8fafc; border-radius:12px; margin-bottom:12px;">(未包含截图)</div>';
    return `<div class="work-card"><div class="meta"><span>👤 ${item.studentName || item.studentUsername}</span><span>👥 ${item.groupName || '未分组'}</span><span>📄 第 ${item.page} 页</span></div>${imageHtml}<div style="font-size:13px; color:#475569; line-height:1.8; margin-bottom:8px;"><div>🎯 中心: <strong>${item.centerChoice}</strong> | 🔄 角度: <strong>${item.currentAngle}°</strong></div><div>⭐ 星星: <strong>${starsCount}</strong> | 📍 O点: <strong>${item.hasOPoint && item.oPoint ? `(${item.oPoint.x}, ${item.oPoint.y})` : '无'}</strong></div></div><div style="font-size:12px; color:#94a3b8; margin-top:auto; padding-top:8px; border-top: 1px dashed #e5edf2;">⏰ ${item.submittedAt || ''}</div></div>`;
  }).join('');
}

function renderWorks(list) {
  if (!worksEl) return; 
  
  // 【修改】任务二不渲染任何作品信息
  if (currentActivity === 2) { 
    worksEl.innerHTML = ''; 
    return; 
  }

  worksEl.innerHTML = '';
  if (currentActivity === 3) { worksEl.innerHTML = `<p style="color:#64748b; text-align: center; padding: 20px;">任务三的截图和状态已显示在上方的专属区域中。</p>`; fetchSubmissions(); return; }
  if (!list.length) { worksEl.innerHTML = `<p style="color:#64748b; text-align: center; padding: 20px;">当前 ${activityMap[currentActivity]} 暂无作品</p>`; return; }
  if (currentActivity === 1) {
    renderTaskSection('任务一作品', list.filter(w => Number(w.task) === 1));
    renderTaskSection('任务二作品', list.filter(w => Number(w.task) === 2));
  } else {
    list.forEach(work => { 
      const card = document.createElement('div'); card.className = 'work-card';
      let extraMeta = work.activity === 4 && work.task ? `<span>第 ${work.task} 页</span>` : '';
      const metaHtml = `<span>${activityMap[work.activity] || '未知活动'}</span>${extraMeta}<span>👥 ${work.groupName || '未分组'}</span><span>👤 ${work.studentName || work.studentUsername}</span>`;
      const imageHtml = work.imageUrl ? `<img class="work-image" src="${work.imageUrl}" alt="作品图片" title="点击放大" onclick="openLightbox(this.src)" />` : '';
      card.innerHTML = `<div class="meta">${metaHtml}</div>${imageHtml}<div style="font-size:12px; color:#94a3b8; margin-bottom:8px;">⏰ ${work.createdAt || ''}</div><div class="action-row"><button class="btn danger" data-id="${work.id}">删除</button></div>`;
      card.querySelector('button[data-id]').addEventListener('click', async () => { if (confirm('确定删除该作品吗？')) { await fetch(`/api/works/${work.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); fetchWorks(); } });
      worksEl.appendChild(card); 
    });
  }
}

function renderTaskSection(title, works) {
  const section = document.createElement('div'); section.className = 'work-section';
  const titleEl = document.createElement('h3'); titleEl.className = 'section-title'; titleEl.textContent = title; section.appendChild(titleEl);
  if (!works.length) { const empty = document.createElement('p'); empty.textContent = '暂无作品'; empty.style.color = '#94a3b8'; section.appendChild(empty); worksEl.appendChild(section); return; }
  works.forEach(work => { 
    const card = document.createElement('div'); card.className = 'work-card';
    const metaHtml = `<span>任务一</span><span>${taskMap[work.task] || '未知任务'}</span><span>👥 ${work.groupName || '未分组'}</span><span>👤 ${work.studentName || work.studentUsername}</span>`;
    const imageHtml = work.imageUrl ? `<img class="work-image" src="${work.imageUrl}" alt="作品图片" title="点击放大" onclick="openLightbox(this.src)" />` : '';
    card.innerHTML = `<div class="meta">${metaHtml}</div>${imageHtml}<div style="font-size:12px; color:#94a3b8; margin-bottom:8px;">⏰ ${work.createdAt || ''}</div><div class="action-row"><button class="btn danger" data-id="${work.id}">删除</button></div>`;
    card.querySelector('button[data-id]').addEventListener('click', async () => { if (confirm('确定删除该作品吗？')) { await fetch(`/api/works/${work.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); fetchWorks(); } });
    section.appendChild(card); 
  });
  worksEl.appendChild(section);
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => { fetchWorks(true); if (currentActivity === 3) fetchSubmissions(true); }, 3000); 
}

tabBtns.forEach(btn => btn.addEventListener('click', () => { currentActivity = Number(btn.dataset.activity); updateActivityUI(); fetchWorks(); }));
if(refreshBtn) refreshBtn.addEventListener('click', () => fetchWorks());
if(clearBtn) {
  clearBtn.addEventListener('click', async () => {
    if (currentActivity === 3) {
      if (!confirm('确定清空任务三的所有提交记录吗？')) return;
      const res = await fetch(`/api/teacher/submissions?activity=3`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) fetchSubmissions(); else msgEl.textContent = '清空失败'; return;
    }
    if (!confirm(`确定清空 ${activityMap[currentActivity]} 的所有作品吗？`)) return;
    const res = await fetch(`/api/works?activity=${currentActivity}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) fetchWorks(); else msgEl.textContent = '清空失败';
  });
}
if(logoutBtn) logoutBtn.addEventListener('click', () => { ['teacherToken', 'role', 'username', 'teacherCurrentActivity'].forEach(k => localStorage.removeItem(k)); if (pollInterval) clearInterval(pollInterval); location.href = '/login.html'; });

updateActivityUI();
fetchWorks();
startPolling();
window.addEventListener('resize', () => { if(currentActivity === 2) resizeTeacherA2Canvas(); if(currentActivity === 3 && tA3Panel.style.display === 'block') resizeTeacherA3Canvas(); });
