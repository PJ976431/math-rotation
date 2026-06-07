const studentToken = localStorage.getItem('studentToken') || localStorage.getItem('token');
const role = localStorage.getItem('role');
const username = localStorage.getItem('username');
const displayName = localStorage.getItem('displayName') || username;

if (!studentToken || role !== 'student') location.href = '/login.html';

const welcomeEl = document.getElementById('welcome');
const logoutBtn = document.getElementById('logoutBtn');
const msgEl = document.getElementById('msg');

const activity1Panel = document.getElementById('activity1Panel');
const activity2Panel = document.getElementById('activity2Panel');
const activity3Panel = document.getElementById('activity3Panel');
const activity4Panel = document.getElementById('activity4Panel');
const tabs = document.querySelectorAll('.tab-btn');
const submitBtn = document.getElementById('submitBtn');

// 任务一
const a1Canvas = document.getElementById('activity1Canvas');
const a1Ctx = a1Canvas ? a1Canvas.getContext('2d') : null;
const a1ResetBtn = document.getElementById('a1ResetBtn');

// 任务二
const a2Canvas = document.getElementById('activity2Canvas');
const a2Ctx = a2Canvas ? a2Canvas.getContext('2d') : null;
const a2ModeLineBtn = document.getElementById('a2ModeLineBtn');
const a2ClearTrailBtn = document.getElementById('a2ClearTrailBtn');
const a2ResetBtn = document.getElementById('a2ResetBtn');
const a2TrailA = document.getElementById('a2TrailA');
const a2TrailB = document.getElementById('a2TrailB');

// 任务三
const starCanvas = document.getElementById('starCanvas');
const ctx = starCanvas ? starCanvas.getContext('2d') : null;
const autoRunBtn = document.getElementById('autoRunBtn');
const resetBtn = document.getElementById('resetBtn');
const submitStarBtn = document.getElementById('submitStarBtn');
const starMsg = document.getElementById('starMsg');
const activity3PrevBtn = document.getElementById('activity3PrevBtn');
const activity3NextBtn = document.getElementById('activity3NextBtn');
const activity3Page2Tools = document.getElementById('activity3Page2Tools');
const addOBtn = document.getElementById('addOBtn');
const oCenterWrap = document.getElementById('oCenterWrap');
const modeStarBtn = document.getElementById('modeStarBtn');
const modeLineBtn = document.getElementById('modeLineBtn');
const clearTrailBtn = document.getElementById('clearTrailBtn');
const trailA = document.getElementById('trailA');
const trailB = document.getElementById('trailB');

// 综合练习
const a4Canvas = document.getElementById('activity4Canvas');
const a4Ctx = a4Canvas ? a4Canvas.getContext('2d') : null;
const a4ResetBtn = document.getElementById('a4ResetBtn');
const a4PrevBtn = document.getElementById('a4PrevBtn');
const a4NextBtn = document.getElementById('a4NextBtn');
const a4SubmitBtn = document.getElementById('a4SubmitBtn');
const a4Msg = document.getElementById('a4Msg');

if (welcomeEl) welcomeEl.textContent = `欢迎你，${displayName || '同学'}！`;

[starCanvas, a1Canvas, a2Canvas, a4Canvas].forEach(c => {
  if (c) {
    c.style.touchAction = 'none';
    c.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    c.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }
});

logoutBtn?.addEventListener('click', () => {
  ['studentToken', 'token', 'role', 'username', 'displayName'].forEach(k => localStorage.removeItem(k));
  location.href = '/login.html';
});

const GRID = 40;
const MAX_STARS = 5;
const STAR_COLORS = ['#ff5d8f', '#7c5cff', '#4cc9f0', '#f9c74f', '#43aa8b'];

const a1State = {
  width: 0, height: 0, A: null, B: null,
  isDrawing: false, drawStart: null, drawEnd: null, drawnLine: null
};

const a2State = {
  width: 0, height: 0, A: null, B: null, selectedCenterType: 'A', angle: 0,
  draggingLine: false, dragStartAngle: 0, dragStartObjAngle: 0,
  fixedStars: [], trails: { A: [], B: [] }, activeTrail: { A: true, B: true }
};

const state = {
  width: 0, height: 0, center: null, A: null, B: null, O: null, hasO: false,
  selectedCenterType: 'A', angle: 0, animating: false, rafId: null, mode: 'star',
  stars: [], draggingStarIndex: -1, dragOffsetX: 0, dragOffsetY: 0,
  draggingLine: false, draggingO: false, lineDragOffset: { x: 0, y: 0 },
  dragStartAngle: 0, dragStartObjAngle: 0,
  trails: { A: [], B: [], O: [] }, // 移除了 seg
  activeTrail: { A: false, B: false, O: false }, 
  activity3Page: 1, awaitingOPlacement: false
};

const a4State = {
  width: 0, height: 0, M: null, N: null, P: null, page: 1,
  isDrawing: false, drawStart: null, drawEnd: null, drawnLine: null
};

function setMsg(text) { if (starMsg) starMsg.textContent = text || ''; }
function setA4Msg(text) { if (a4Msg) a4Msg.textContent = text || ''; }
function snapToGrid(v) { return Math.round(v / GRID) * GRID; }
function snapPoint(p) { return { x: snapToGrid(p.x), y: snapToGrid(p.y) }; }

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

function drawGrid(context, width, height) {
  context.save(); context.strokeStyle = '#dbe7f3'; context.lineWidth = 1;
  for (let x = 0; x <= width; x += GRID) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y <= height; y += GRID) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.restore();
}

function drawStarShape(context, x, y, color) {
  const spikes = 5; const outerRadius = 12; const innerRadius = 5;
  let rot = Math.PI / 2 * 3; const step = Math.PI / spikes;
  context.save(); context.translate(x, y); context.beginPath(); context.moveTo(0, -outerRadius);
  for (let i = 0; i < spikes; i++) {
    context.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius); rot += step;
    context.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius); rot += step;
  }
  context.closePath(); context.fillStyle = color; context.shadowColor = 'rgba(0,0,0,0.12)'; context.shadowBlur = 6; context.fill();
  context.lineWidth = 1.5; context.strokeStyle = 'rgba(255,255,255,0.85)'; context.stroke(); context.restore();
}

function drawPoint(context, p, label, color) {
  context.save(); context.fillStyle = color; context.strokeStyle = color; context.lineWidth = 2;
  context.beginPath(); context.arc(p.x, p.y, 7, 0, Math.PI * 2); context.fill(); context.stroke();
  context.fillStyle = '#1f2d3d'; context.font = 'bold 16px sans-serif'; context.fillText(label, p.x + 10, p.y - 10); context.restore();
}

function drawCenter(context, c, label = '', color = '#27ae60') {
  context.save(); context.fillStyle = color; context.beginPath(); context.arc(c.x, c.y, 7, 0, Math.PI * 2); context.fill();
  if (label) { context.fillStyle = color; context.font = 'bold 15px sans-serif'; context.fillText(label, c.x + 10, c.y + 5); }
  context.restore();
}

function drawSegment(context, A, B, isDashed = false) {
  context.save(); 
  context.strokeStyle = isDashed ? '#94a3b8' : '#2d6cdf'; 
  context.lineWidth = 4; 
  context.lineCap = 'round';
  if (isDashed) context.setLineDash([8, 8]);
  context.beginPath(); context.moveTo(A.x, A.y); context.lineTo(B.x, B.y); context.stroke(); 
  context.setLineDash([]);
  context.restore();
}

function drawTrail(context, points, color) {
  if (!points || points.length < 2) return;
  context.save(); context.strokeStyle = color; context.lineWidth = 2; context.beginPath();
  points.forEach((p, i) => { if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y); });
  context.stroke(); context.restore();
}

function drawRotationArc(context, center, radius, startAngle, endAngle, color) {
  context.save();
  context.strokeStyle = color; context.fillStyle = color; context.lineWidth = 2.5; context.setLineDash([]);
  let diff = normalizeAngleDiff(endAngle - startAngle);
  let anticlockwise = diff < 0;
  context.beginPath(); context.arc(center.x, center.y, radius, startAngle, endAngle, anticlockwise); context.stroke();
  const arrowLen = 12; const arrowAngle = Math.PI / 6; 
  const tangent = anticlockwise ? endAngle - Math.PI / 2 : endAngle + Math.PI / 2;
  const tipX = center.x + radius * Math.cos(endAngle);
  const tipY = center.y + radius * Math.sin(endAngle);
  context.beginPath(); context.moveTo(tipX, tipY);
  context.lineTo(tipX - arrowLen * Math.cos(tangent - arrowAngle), tipY - arrowLen * Math.sin(tangent - arrowAngle));
  context.lineTo(tipX - arrowLen * Math.cos(tangent + arrowAngle), tipY - arrowLen * Math.sin(tangent + arrowAngle));
  context.closePath(); context.fill();
  context.restore();
}

// ================= 任务一 (自由画线) =================
function resizeA1Canvas() {
  if (!a1Canvas || !a1Ctx) return;
  const rect = a1Canvas.getBoundingClientRect();
  a1Canvas.width = rect.width; a1Canvas.height = rect.height;
  a1State.width = a1Canvas.width; a1State.height = a1Canvas.height;
  const cx = Math.round(a1State.width / 2 / GRID) * GRID;
  const cy = Math.round(a1State.height / 2 / GRID) * GRID;
  a1State.A = { x: cx - 2 * GRID, y: cy }; 
  a1State.B = { x: cx + 2 * GRID, y: cy }; 
  drawActivity1();
}

function drawActivity1() {
  if (!a1Ctx) return;
  a1Ctx.clearRect(0, 0, a1State.width, a1State.height);
  a1Ctx.fillStyle = '#f8fbff'; a1Ctx.fillRect(0, 0, a1State.width, a1State.height);
  drawGrid(a1Ctx, a1State.width, a1State.height);
  
  // 绘制原线段（如果已画新线，则变虚线）
  drawSegment(a1Ctx, a1State.A, a1State.B, a1State.drawnLine !== null);
  drawPoint(a1Ctx, a1State.A, 'A', '#94a3b8');
  drawPoint(a1Ctx, a1State.B, 'B', '#94a3b8');

  if (a1State.drawnLine) {
    const { start, end } = a1State.drawnLine;
    drawSegment(a1Ctx, start, end, false); // 新线段实线
    
    let labelStart, labelEnd, center, basePt, currPt;
    if (start.x === a1State.A.x && start.y === a1State.A.y) {
      labelStart = 'A'; labelEnd = "B'"; center = a1State.A; basePt = a1State.B; currPt = end;
    } else if (start.x === a1State.B.x && start.y === a1State.B.y) {
      labelStart = "A'"; labelEnd = 'B'; center = a1State.B; basePt = a1State.A; currPt = end;
    } else {
      labelStart = "A'"; labelEnd = "B'"; center = start; basePt = a1State.A; currPt = end;
    }
    
    drawPoint(a1Ctx, start, labelStart, '#e74c3c');
    drawPoint(a1Ctx, end, labelEnd, '#e74c3c');
    drawCenter(a1Ctx, center, '', '#27ae60');

    const startAng = Math.atan2(basePt.y - center.y, basePt.x - center.x);
    const endAng = Math.atan2(currPt.y - center.y, currPt.x - center.x);
    drawRotationArc(a1Ctx, center, 45, startAng, endAng, '#f59e0b');

  } else if (a1State.isDrawing && a1State.drawStart && a1State.drawEnd) {
    drawSegment(a1Ctx, a1State.drawStart, a1State.drawEnd, false);
    drawPoint(a1Ctx, a1State.drawEnd, '?', '#e74c3c');
  }
  
  a1Canvas.style.cursor = a1State.drawnLine ? 'default' : 'crosshair';
}

function resetA1All() {
  a1State.isDrawing = false; a1State.drawStart = null; a1State.drawEnd = null; a1State.drawnLine = null;
  drawActivity1();
}

// ================= 任务二 =================
function initActivity2FixedStars() {
  if (!a2State.A || !a2State.B) return;
  a2State.fixedStars = [
    { x: a2State.A.x + 4 * GRID, y: a2State.A.y - 4 * GRID, color: '#43aa8b' }, 
    { x: a2State.A.x - 4 * GRID, y: a2State.A.y, color: '#7c5cff' },             
    { x: a2State.A.x, y: a2State.A.y + 4 * GRID, color: '#4cc9f0' }              
  ];
}

function resizeA2Canvas() {
  if (!a2Canvas || !a2Ctx) return;
  const rect = a2Canvas.getBoundingClientRect();
  a2Canvas.width = rect.width; a2Canvas.height = rect.height;
  a2State.width = a2Canvas.width; a2State.height = a2Canvas.height;
  const cx = Math.round(a2State.width / 2 / GRID) * GRID;
  const cy = Math.round(a2State.height / 2 / GRID) * GRID;
  a2State.A = { x: cx, y: cy }; 
  a2State.B = { x: cx + 4 * GRID, y: cy }; 
  initActivity2FixedStars();
  drawActivity2();
}

function drawActivity2() {
  if (!a2Ctx) return;
  a2Ctx.clearRect(0, 0, a2State.width, a2State.height);
  a2Ctx.fillStyle = '#f8fbff'; a2Ctx.fillRect(0, 0, a2State.width, a2State.height);
  drawGrid(a2Ctx, a2State.width, a2State.height);
  const center = a2State.selectedCenterType === 'A' ? a2State.A : a2State.B;
  const A = rotatePoint(a2State.A, center, a2State.angle);
  const B = rotatePoint(a2State.B, center, a2State.angle);
  drawTrail(a2Ctx, a2State.trails.A, 'rgba(231, 76, 60, 0.45)');
  drawTrail(a2Ctx, a2State.trails.B, 'rgba(39, 174, 96, 0.45)');
  drawSegment(a2Ctx, A, B);
  drawPoint(a2Ctx, A, 'A', '#e74c3c');
  drawPoint(a2Ctx, B, 'B', '#e74c3c');
  drawCenter(a2Ctx, center, '', '#27ae60'); 
  a2State.fixedStars.forEach(s => drawStarShape(a2Ctx, s.x, s.y, s.color));
  if (a2TrailA) a2State.activeTrail.A = a2TrailA.checked;
  if (a2TrailB) a2State.activeTrail.B = a2TrailB.checked;
  a2Canvas.style.cursor = 'grab';
}

function resetA2All() {
  a2State.angle = 0; a2State.selectedCenterType = 'A';
  a2State.draggingLine = false; a2State.trails = { A: [], B: [] };
  if (a2TrailA) a2TrailA.checked = true;
  if (a2TrailB) a2TrailB.checked = true;
  document.querySelector('input[name="a2CenterChoice"][value="A"]').checked = true;
  drawActivity2();
}

// ================= 任务三 =================
function resizeCanvas() {
  if (!starCanvas) return;
  const rect = starCanvas.getBoundingClientRect();
  starCanvas.width = rect.width; starCanvas.height = rect.height;
  state.width = starCanvas.width; state.height = starCanvas.height;
  const cx = Math.round(state.width / 2 / GRID) * GRID;
  const cy = Math.round(state.height / 2 / GRID) * GRID;
  state.center = { x: cx, y: cy };
  state.A = { x: cx - 2 * GRID, y: cy };
  state.B = { x: cx + 2 * GRID, y: cy };
  if (!state.O) state.O = { x: cx, y: cy - 2 * GRID };
  draw();
}

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.fillStyle = '#f8fbff'; ctx.fillRect(0, 0, state.width, state.height);
  drawGrid(ctx, state.width, state.height);
  const center = getCenterPoint();
  const A = rotatePoint(state.A, center, state.angle);
  const B = rotatePoint(state.B, center, state.angle);
  drawTrail(ctx, state.trails.A, 'rgba(231, 76, 60, 0.45)');
  drawTrail(ctx, state.trails.B, 'rgba(39, 174, 96, 0.45)');
  drawTrail(ctx, state.trails.O, 'rgba(244, 114, 182, 0.45)');
  drawSegment(ctx, A, B);
  drawPoint(ctx, A, 'A', '#e74c3c');
  drawPoint(ctx, B, 'B', '#e74c3c');
  if (state.activity3Page === 2 && state.hasO) drawCenter(ctx, state.O, 'O点', '#f472b6');
  drawCenter(ctx, center, '', '#27ae60'); 
  state.stars.forEach((s, i) => drawStarShape(ctx, s.x, s.y, STAR_COLORS[i % STAR_COLORS.length]));

  if (activity3Page2Tools) activity3Page2Tools.classList.toggle('hidden', state.activity3Page !== 2);
  if (activity3PrevBtn) activity3PrevBtn.classList.toggle('hidden', state.activity3Page === 1);
  if (activity3NextBtn) activity3NextBtn.classList.toggle('hidden', state.activity3Page === 2);
  if (oCenterWrap) oCenterWrap.classList.toggle('hidden', !state.hasO || state.activity3Page !== 2);
  starCanvas.style.cursor = state.mode === 'star' ? 'crosshair' : 'grab';
}

function getCenterPoint() {
  if (state.selectedCenterType === 'A') return state.A;
  if (state.selectedCenterType === 'B') return state.B;
  if (state.selectedCenterType === 'O' && state.hasO) return state.O;
  return state.A;
}

function getSelectedCenterType() { return document.querySelector('input[name="centerChoice"]:checked')?.value || 'A'; }
function getA2SelectedCenterType() { return document.querySelector('input[name="a2CenterChoice"]:checked')?.value || 'A'; }

function setActivity3Page(page) {
  state.activity3Page = page;
  if (page === 2) {
    stopAnimation(); state.angle = 0; state.stars = []; 
    state.trails = { A: [], B: [], O: [] }; 
    state.hasO = false; state.awaitingOPlacement = false;
    if (state.center) state.O = { x: state.center.x, y: state.center.y - 2 * GRID };
    state.mode = 'line'; state.selectedCenterType = 'A';
    document.querySelector('input[name="centerChoice"][value="A"]').checked = true;
  } else {
    state.mode = 'star'; state.selectedCenterType = 'A';
    document.querySelector('input[name="centerChoice"][value="A"]').checked = true;
  }
  state.activeTrail = { A: false, B: false, O: false };
  if (trailA) trailA.checked = false;
  if (trailB) trailB.checked = false;
  setMsg(''); draw();
}

function startAnimation() {
  if (state.animating) return;
  if (state.selectedCenterType === 'O' && !state.hasO) { setMsg('请先添加 O 点'); return; }
  state.angle = 0; state.animating = true; setMsg('');
  const step = () => {
    state.angle += 2;
    const center = getCenterPoint();
    const A = rotatePoint(state.A, center, state.angle);
    const B = rotatePoint(state.B, center, state.angle);
    if (state.activeTrail.A) state.trails.A.push({ x: A.x, y: A.y });
    if (state.activeTrail.B) state.trails.B.push({ x: B.x, y: B.y });
    if (state.activeTrail.O && state.hasO) state.trails.O.push({ x: center.x, y: center.y });
    draw();
    if (state.angle >= 360) {
      state.angle = 360; draw(); state.animating = false;
      cancelAnimationFrame(state.rafId); state.rafId = null; setMsg('旋转一周完成'); return;
    }
    state.rafId = requestAnimationFrame(step);
  };
  state.rafId = requestAnimationFrame(step);
}

function stopAnimation() {
  state.animating = false;
  if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
}

function resetAll() {
  stopAnimation(); state.angle = 0; state.mode = 'star'; state.stars = [];
  state.draggingStarIndex = -1; state.dragOffsetX = 0; state.dragOffsetY = 0;
  state.draggingLine = false; state.draggingO = false; state.lineDragOffset = { x: 0, y: 0 };
  state.trails = { A: [], B: [], O: [] }; state.selectedCenterType = 'A';
  state.hasO = false; state.awaitingOPlacement = false;
  if (state.center) state.O = { x: state.center.x, y: state.center.y - 2 * GRID };
  document.querySelector('input[name="centerChoice"][value="A"]').checked = true;
  state.activeTrail = { A: false, B: false, O: false };
  if (trailA) trailA.checked = false;
  if (trailB) trailB.checked = false;
  setMsg('已恢复到初始状态'); draw();
}

function exportLineState() {
  const center = getCenterPoint();
  const A = rotatePoint(state.A, center, state.angle);
  const B = rotatePoint(state.B, center, state.angle);
  return { A: { x: A.x, y: A.y }, B: { x: B.x, y: B.y }, baseA: { x: state.A.x, y: state.A.y }, baseB: { x: state.B.x, y: state.B.y }, center: { x: center.x, y: center.y } };
}

async function submitActivity3ToServer(page) {
  try {
    setMsg('正在生成截图并提交...');
    const blob = await new Promise(resolve => starCanvas.toBlob(resolve, 'image/png'));
    if (!blob) { setMsg('截图生成失败'); return; }
    const file = new File([blob], `activity3_page${page}.png`, { type: 'image/png' });
    const payload = {
      activity: 3, page, groupName: displayName || username,
      centerChoice: state.selectedCenterType, currentAngle: Math.round(state.angle), mode: state.mode,
      hasOPoint: state.hasO, oPoint: state.hasO ? { x: state.O.x, y: state.O.y } : null,
      oPointText: state.hasO ? `O点坐标：(${state.O.x}, ${state.O.y})` : '未添加',
      stars: state.stars.map(s => ({ x: s.x, y: s.y })),
      trailA: state.trails.A, trailB: state.trails.B, trailO: state.trails.O,
      lineState: exportLineState(), canvasSize: { width: state.width, height: state.height, grid: GRID },
      pageText: page === 1 ? '任务三第1页' : '任务三第2页'
    };
    const formData = new FormData();
    formData.append('activity', '3'); formData.append('page', String(page)); 
    formData.append('groupName', payload.groupName); formData.append('file', file); 
    formData.append('workData', JSON.stringify(payload)); 
    const res = await fetch('/api/student/submit-work', { method: 'POST', headers: { 'Authorization': `Bearer ${studentToken}` }, body: formData });
    const data = await res.json();
    if (!res.ok) { setMsg(data.message || '提交失败'); return; }
    setMsg(`任务三第 ${page} 页截图提交成功！`);
  } catch (err) { setMsg('网络错误，提交失败'); }
}

// ================= 综合练习 (自由画线) =================
function resizeA4Canvas() {
  if (!a4Canvas || !a4Ctx) return;
  const rect = a4Canvas.getBoundingClientRect();
  a4Canvas.width = rect.width; a4Canvas.height = rect.height;
  a4State.width = a4Canvas.width; a4State.height = a4Canvas.height;
  const cx = Math.round(a4State.width / 2 / GRID) * GRID;
  const cy = Math.round(a4State.height / 2 / GRID) * GRID;
  
  if (a4State.page === 1) {
    a4State.P = { x: cx, y: cy };
    a4State.M = { x: cx - 2 * GRID, y: cy };
    a4State.N = { x: cx + 3 * GRID, y: cy };
  } else {
    a4State.M = { x: cx - 3 * GRID, y: cy };
    a4State.N = { x: cx + 2 * GRID, y: cy };
    a4State.P = { x: cx + 4 * GRID, y: cy };
  }
  a4State.isDrawing = false; a4State.drawStart = null; a4State.drawEnd = null; a4State.drawnLine = null;
  drawActivity4();
}

function drawActivity4() {
  if (!a4Ctx) return;
  a4Ctx.clearRect(0, 0, a4State.width, a4State.height);
  a4Ctx.fillStyle = '#f8fbff'; a4Ctx.fillRect(0, 0, a4State.width, a4State.height);
  drawGrid(a4Ctx, a4State.width, a4State.height);
  
  // 绘制原线段（如果已画新线，则变虚线）
  drawSegment(a4Ctx, a4State.M, a4State.N, a4State.drawnLine !== null);
  drawPoint(a4Ctx, a4State.M, 'M', '#94a3b8');
  drawPoint(a4Ctx, a4State.N, 'N', '#94a3b8');
  drawCenter(a4Ctx, a4State.P, 'P', '#27ae60');

  if (a4State.drawnLine) {
    const { start, end } = a4State.drawnLine;
    drawSegment(a4Ctx, start, end, false);
    drawPoint(a4Ctx, start, "M'", '#e74c3c');
    drawPoint(a4Ctx, end, "N'", '#e74c3c');
  } else if (a4State.isDrawing && a4State.drawStart && a4State.drawEnd) {
    drawSegment(a4Ctx, a4State.drawStart, a4State.drawEnd, false);
    drawPoint(a4Ctx, a4State.drawEnd, '?', '#e74c3c');
  }
  
  a4Canvas.style.cursor = a4State.drawnLine ? 'default' : 'crosshair';
}

function resetA4All() {
  a4State.isDrawing = false; a4State.drawStart = null; a4State.drawEnd = null; a4State.drawnLine = null;
  drawActivity4();
}

function setA4Page(page) {
  a4State.page = page;
  a4PrevBtn.classList.toggle('hidden', page === 1);
  a4NextBtn.classList.toggle('hidden', page === 2);
  setA4Msg('');
  resizeA4Canvas();
}

a4SubmitBtn?.addEventListener('click', async () => {
  try {
    setA4Msg('正在生成截图并提交...');
    const blob = await new Promise(resolve => a4Canvas.toBlob(resolve, 'image/png'));
    if (!blob) { setA4Msg('截图生成失败'); return; }
    const file = new File([blob], `activity4_page${a4State.page}.png`, { type: 'image/png' });
    const formData = new FormData();
    formData.append('activity', '4'); 
    formData.append('task', String(a4State.page)); 
    formData.append('groupName', displayName || username); 
    formData.append('file', file);
    const res = await fetch('/api/works', { method: 'POST', headers: { 'Authorization': `Bearer ${studentToken}` }, body: formData });
    const data = await res.json();
    setA4Msg(res.ok ? `综合练习第 ${a4State.page} 页提交成功！` : (data.message || '提交失败'));
  } catch (err) { setA4Msg('网络错误，提交失败'); }
});

// ================= 事件绑定 =================
document.querySelectorAll('input[name="centerChoice"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const next = getSelectedCenterType();
    if (next === 'O' && !state.hasO) {
      setMsg('请先添加 O 点');
      document.querySelector('input[name="centerChoice"][value="A"]').checked = true; return;
    }
    state.selectedCenterType = next; state.angle = 0; setMsg(''); draw();
  });
});

document.querySelectorAll('input[name="a2CenterChoice"]').forEach(r => r.addEventListener('change', () => { a2State.selectedCenterType = getA2SelectedCenterType(); a2State.angle = 0; drawActivity2(); }));

trailA?.addEventListener('change', () => { state.activeTrail.A = trailA.checked; draw(); });
trailB?.addEventListener('change', () => { state.activeTrail.B = trailB.checked; draw(); });
a2TrailA?.addEventListener('change', () => { a2State.activeTrail.A = a2TrailA.checked; drawActivity2(); });
a2TrailB?.addEventListener('change', () => { a2State.activeTrail.B = a2TrailB.checked; drawActivity2(); });

modeStarBtn?.addEventListener('click', () => { state.mode = 'star'; setMsg(''); draw(); });
modeLineBtn?.addEventListener('click', () => { state.mode = 'line'; setMsg(''); draw(); });
clearTrailBtn?.addEventListener('click', () => { state.trails = { A: [], B: [], O: [] }; draw(); });

a2ModeLineBtn?.addEventListener('click', () => { a2State.selectedCenterType = getA2SelectedCenterType(); drawActivity2(); });
a2ClearTrailBtn?.addEventListener('click', () => { a2State.trails = { A: [], B: [] }; drawActivity2(); });
a2ResetBtn?.addEventListener('click', resetA2All);

a4ResetBtn?.addEventListener('click', resetA4All);
a4PrevBtn?.addEventListener('click', () => setA4Page(1));
a4NextBtn?.addEventListener('click', () => setA4Page(2));

a1ResetBtn?.addEventListener('click', resetA1All);
resetBtn?.addEventListener('click', resetAll);
autoRunBtn?.addEventListener('click', () => startAnimation());
addOBtn?.addEventListener('click', () => { state.awaitingOPlacement = true; state.mode = 'line'; setMsg('请点击网格点放置 O 点'); draw(); });

submitBtn?.addEventListener('click', async () => {
  try {
    msgEl.textContent = '正在生成截图并提交...';
    const blob = await new Promise(resolve => a1Canvas.toBlob(resolve, 'image/png'));
    if (!blob) { msgEl.textContent = '截图生成失败'; return; }
    const file = new File([blob], `activity1.png`, { type: 'image/png' });
    const formData = new FormData();
    formData.append('activity', '1'); formData.append('groupName', displayName || username); formData.append('file', file);
    const res = await fetch('/api/works', { method: 'POST', headers: { 'Authorization': `Bearer ${studentToken}` }, body: formData });
    const data = await res.json();
    msgEl.textContent = res.ok ? '任务一作品已提交' : (data.message || '提交失败');
  } catch (err) { msgEl.textContent = '任务一提交失败'; }
});

submitStarBtn?.addEventListener('click', () => submitActivity3ToServer(state.activity3Page));

function canvasPoint(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// 任务一 交互 (自由画线)
if (a1Canvas) {
  a1Canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (a1State.drawnLine) return;
    const p = snapPoint(canvasPoint(e, a1Canvas));
    a1State.isDrawing = true;
    a1State.drawStart = p;
    a1State.drawEnd = p;
    drawActivity1();
  });
  a1Canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (!a1State.isDrawing) return;
    a1State.drawEnd = snapPoint(canvasPoint(e, a1Canvas));
    drawActivity1();
  });
  a1Canvas.addEventListener('pointerup', (e) => {
    if (!a1State.isDrawing) return;
    a1State.isDrawing = false;
    const end = snapPoint(canvasPoint(e, a1Canvas));
    if (a1State.drawStart.x !== end.x || a1State.drawStart.y !== end.y) {
      a1State.drawnLine = { start: a1State.drawStart, end: end };
    }
    a1State.drawStart = null; a1State.drawEnd = null;
    drawActivity1();
  });
  a1Canvas.addEventListener('pointerleave', () => { if(a1State.isDrawing) { a1State.isDrawing = false; drawActivity1(); } });
}

// 任务二 交互
if (a2Canvas) {
  a2Canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault(); 
    const p = canvasPoint(e, a2Canvas);
    const center = a2State.selectedCenterType === 'A' ? a2State.A : a2State.B;
    const A = rotatePoint(a2State.A, center, a2State.angle);
    const B = rotatePoint(a2State.B, center, a2State.angle);
    if (Math.hypot(A.x - p.x, A.y - p.y) < 35 || Math.hypot(B.x - p.x, B.y - p.y) < 35) {
      a2State.draggingLine = true;
      a2State.dragStartAngle = Math.atan2(p.y - center.y, p.x - center.x);
      a2State.dragStartObjAngle = a2State.angle;
    }
  });
  a2Canvas.addEventListener('pointermove', (e) => {
    e.preventDefault(); 
    if (!a2State.draggingLine) return;
    const p = canvasPoint(e, a2Canvas);
    const center = a2State.selectedCenterType === 'A' ? a2State.A : a2State.B;
    const currentMouseAngle = Math.atan2(p.y - center.y, p.x - center.x);
    let delta = normalizeAngleDiff(currentMouseAngle - a2State.dragStartAngle);
    a2State.angle = a2State.dragStartObjAngle + delta * 180 / Math.PI; 
    const A = rotatePoint(a2State.A, center, a2State.angle);
    const B = rotatePoint(a2State.B, center, a2State.angle);
    if (a2State.activeTrail.A) a2State.trails.A.push({ x: A.x, y: A.y });
    if (a2State.activeTrail.B) a2State.trails.B.push({ x: B.x, y: B.y });
    drawActivity2();
  });
  a2Canvas.addEventListener('pointerup', () => { a2State.draggingLine = false; });
  a2Canvas.addEventListener('pointerleave', () => { a2State.draggingLine = false; });
}

// 综合练习 交互 (自由画线)
if (a4Canvas) {
  a4Canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (a4State.drawnLine) return;
    const p = snapPoint(canvasPoint(e, a4Canvas));
    a4State.isDrawing = true;
    a4State.drawStart = p;
    a4State.drawEnd = p;
    drawActivity4();
  });
  a4Canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (!a4State.isDrawing) return;
    a4State.drawEnd = snapPoint(canvasPoint(e, a4Canvas));
    drawActivity4();
  });
  a4Canvas.addEventListener('pointerup', (e) => {
    if (!a4State.isDrawing) return;
    a4State.isDrawing = false;
    const end = snapPoint(canvasPoint(e, a4Canvas));
    if (a4State.drawStart.x !== end.x || a4State.drawStart.y !== end.y) {
      a4State.drawnLine = { start: a4State.drawStart, end: end };
    }
    a4State.drawStart = null; a4State.drawEnd = null;
    drawActivity4();
  });
  a4Canvas.addEventListener('pointerleave', () => { if(a4State.isDrawing) { a4State.isDrawing = false; drawActivity4(); } });
}

// 任务三 交互 
starCanvas?.addEventListener('pointerdown', (e) => {
  e.preventDefault(); 
  const p = canvasPoint(e, starCanvas);
  if (state.activity3Page === 2 && state.awaitingOPlacement) {
    state.O = snapPoint(p); state.hasO = true; state.awaitingOPlacement = false;
    state.selectedCenterType = 'O';
    document.querySelector('input[name="centerChoice"][value="O"]').checked = true; setMsg('O 点已放置'); draw(); return;
  }
  if (state.mode === 'star') {
    const gridP = snapPoint(p);
    const idx = state.stars.findIndex(s => Math.hypot(s.x - gridP.x, s.y - gridP.y) < 35);
    if (idx >= 0) {
      state.draggingStarIndex = idx;
      state.dragOffsetX = state.stars[idx].x - gridP.x;
      state.dragOffsetY = state.stars[idx].y - gridP.y;
    } else {
      if (state.stars.length >= MAX_STARS) { setMsg('最多只能新增 5 颗星星'); return; }
      state.stars.push({ x: gridP.x, y: gridP.y });
      state.draggingStarIndex = state.stars.length - 1;
      state.dragOffsetX = 0; state.dragOffsetY = 0;
    }
    draw(); return;
  }
  if (state.mode === 'line') {
    const center = getCenterPoint();
    const A = rotatePoint(state.A, center, state.angle);
    const B = rotatePoint(state.B, center, state.angle);
    if (state.activity3Page === 2 && state.hasO && Math.hypot(state.O.x - p.x, state.O.y - p.y) < 35) {
      state.draggingO = true; state.lineDragOffset = { x: p.x - state.O.x, y: p.y - state.O.y }; return;
    }
    if (Math.hypot(A.x - p.x, A.y - p.y) < 35 || Math.hypot(B.x - p.x, B.y - p.y) < 35) {
      state.draggingLine = true;
      state.dragStartAngle = Math.atan2(p.y - center.y, p.x - center.x);
      state.dragStartObjAngle = state.angle;
    }
  }
});

starCanvas?.addEventListener('pointermove', (e) => {
  e.preventDefault(); 
  const p = canvasPoint(e, starCanvas);
  if (state.mode === 'star' && state.draggingStarIndex >= 0) {
    state.stars[state.draggingStarIndex] = snapPoint({ x: p.x + state.dragOffsetX, y: p.y + state.dragOffsetY }); draw(); return;
  }
  if (state.mode === 'line' && state.draggingO && state.activity3Page === 2 && state.hasO) {
    state.O = snapPoint({ x: p.x - state.lineDragOffset.x, y: p.y - state.lineDragOffset.y });
    state.selectedCenterType = 'O';
    document.querySelector('input[name="centerChoice"][value="O"]').checked = true; draw(); return;
  }
  if (state.mode === 'line' && state.draggingLine) {
    const fixedCenter = getCenterPoint();
    const currentMouseAngle = Math.atan2(p.y - fixedCenter.y, p.x - fixedCenter.x);
    let delta = normalizeAngleDiff(currentMouseAngle - state.dragStartAngle);
    state.angle = state.dragStartObjAngle + delta * 180 / Math.PI; 
    const A = rotatePoint(state.A, fixedCenter, state.angle);
    const B = rotatePoint(state.B, fixedCenter, state.angle);
    if (state.activeTrail.A) state.trails.A.push({ x: A.x, y: A.y });
    if (state.activeTrail.B) state.trails.B.push({ x: B.x, y: B.y });
    draw();
  }
});

starCanvas?.addEventListener('pointerup', () => { state.draggingStarIndex = -1; state.draggingLine = false; state.draggingO = false; });
starCanvas?.addEventListener('pointerleave', () => { state.draggingStarIndex = -1; state.draggingLine = false; state.draggingO = false; });

// Tab 切换
function showPanel(activity) {
  [activity1Panel, activity2Panel, activity3Panel, activity4Panel].forEach(p => p && p.classList.add('hidden'));
  if (activity === 1 && activity1Panel) { activity1Panel.classList.remove('hidden'); setTimeout(resizeA1Canvas, 50); }
  if (activity === 2 && activity2Panel) { activity2Panel.classList.remove('hidden'); setTimeout(resizeA2Canvas, 50); }
  if (activity === 3 && activity3Panel) { activity3Panel.classList.remove('hidden'); setTimeout(() => { resizeCanvas(); draw(); }, 50); }
  if (activity === 4 && activity4Panel) { activity4Panel.classList.remove('hidden'); setTimeout(resizeA4Canvas, 50); }
}

tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  showPanel(Number(tab.dataset.activity));
}));

activity3PrevBtn?.addEventListener('click', () => setActivity3Page(1));
activity3NextBtn?.addEventListener('click', () => setActivity3Page(2));

window.addEventListener('resize', () => { resizeCanvas(); resizeA1Canvas(); resizeA2Canvas(); resizeA4Canvas(); });
showPanel(1);
