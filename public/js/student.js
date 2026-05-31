const studentToken = localStorage.getItem('studentToken') || localStorage.getItem('token');
const role = localStorage.getItem('role');
const username = localStorage.getItem('username');
const displayName = localStorage.getItem('displayName') || username;

if (!studentToken || role !== 'student') {
  location.href = '/login.html';
}

const welcomeEl = document.getElementById('welcome');
const logoutBtn = document.getElementById('logoutBtn');
const msgEl = document.getElementById('msg');

const activity1Panel = document.getElementById('activity1Panel');
const activity2Panel = document.getElementById('activity2Panel');
const activity3Panel = document.getElementById('activity3Panel');
const tabs = document.querySelectorAll('.tab-btn');

const taskText = document.getElementById('taskText');
const activity23TaskText = document.getElementById('activity23TaskText');

const imageInput = document.getElementById('imageInput');
const cameraBtn = document.getElementById('cameraBtn');
const imageInfo = document.getElementById('imageInfo');
const previewImg = document.getElementById('previewImg');
const submitBtn = document.getElementById('submitBtn');
const pageNavBtn = document.getElementById('pageNavBtn');

const a2Canvas = document.getElementById('activity2Canvas');
const a2Ctx = a2Canvas ? a2Canvas.getContext('2d') : null;
const a2ModeLineBtn = document.getElementById('a2ModeLineBtn');
const a2ClearTrailBtn = document.getElementById('a2ClearTrailBtn');
const a2AutoRunBtn = document.getElementById('a2AutoRunBtn');
const a2ResetBtn = document.getElementById('a2ResetBtn');
const a2TrailA = document.getElementById('a2TrailA');
const a2TrailB = document.getElementById('a2TrailB');

const starCanvas = document.getElementById('starCanvas');
const ctx = starCanvas ? starCanvas.getContext('2d') : null;

const autoRunBtn = document.getElementById('autoRunBtn');
const resetBtn = document.getElementById('resetBtn');
const submitStarBtn = document.getElementById('submitStarBtn');
const starMsg = document.getElementById('starMsg');

const modeText = document.getElementById('modeText');
const angleText = document.getElementById('angleText');
const centerText = document.getElementById('centerText');
const starCountText = document.getElementById('starCount');
const oPointText = document.getElementById('oPointText');
const oPointStatusWrap = document.getElementById('oPointStatusWrap');
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
const trailSeg = document.getElementById('trailSeg');

if (welcomeEl) welcomeEl.textContent = `欢迎你，${displayName || '同学'}！`;

// 【优化】针对平板操作的优化：阻止画布触摸时的默认滚动，优化相机调用
if (starCanvas) {
  starCanvas.style.touchAction = 'none';
  starCanvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  starCanvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}
if (a2Canvas) {
  a2Canvas.style.touchAction = 'none';
  a2Canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  a2Canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem('studentToken');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('displayName');
  localStorage.removeItem('studentCurrentActivity');
  location.href = '/login.html';
});

const GRID = 40;
const MAX_STARS = 5;
const STAR_COLORS = ['#ff5d8f', '#7c5cff', '#4cc9f0', '#f9c74f', '#43aa8b'];

const state = {
  width: 0,
  height: 0,
  center: null,
  A: null,
  B: null,
  O: null,
  hasO: false,
  selectedCenterType: 'A',
  angle: 0,
  animating: false,
  rafId: null,
  mode: 'star',
  stars: [],
  draggingStarIndex: -1,
  dragOffsetX: 0,
  dragOffsetY: 0,
  draggingLine: false,
  draggingO: false,
  lineDragOffset: { x: 0, y: 0 },
  dragStartAngle: 0,     // 【新增】记录拖拽起始鼠标角度
  dragStartObjAngle: 0,  // 【新增】记录拖拽起始对象角度
  trails: { A: [], B: [], O: [], seg: [] },
  activeTrail: { A: true, B: true, O: false, seg: true },
  activity1Step: 1,
  activity3Page: 1,
  awaitingOPlacement: false
};

const a2State = {
  width: 0,
  height: 0,
  center: null,
  A: null,
  B: null,
  selectedCenterType: 'A',
  angle: 0,
  animating: false,
  rafId: null,
  draggingLine: false,
  dragStartAngle: 0,     // 【新增】
  dragStartObjAngle: 0,  // 【新增】
  fixedStars: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ],
  trails: { A: [], B: [] },
  activeTrail: { A: true, B: true }
};

function setMsg(text) {
  if (starMsg) starMsg.textContent = text || '';
}

function snapToGrid(v) {
  return Math.round(v / GRID) * GRID;
}

function snapPoint(p) {
  return { x: snapToGrid(p.x), y: snapToGrid(p.y) };
}

function rotatePoint(p, c, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return {
    x: c.x + dx * cos - dy * sin,
    y: c.y + dx * sin + dy * cos
  };
}

function drawGrid(context, width, height) {
  context.save();
  context.strokeStyle = '#dbe7f3';
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += GRID) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += GRID) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();
}

function drawStarShape(context, x, y, color) {
  const spikes = 5;
  const outerRadius = 12;
  const innerRadius = 5;
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;

  context.save();
  context.translate(x, y);
  context.beginPath();
  context.moveTo(0, -outerRadius);
  for (let i = 0; i < spikes; i++) {
    context.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
    rot += step;
    context.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
    rot += step;
  }
  context.closePath();
  context.fillStyle = color;
  context.shadowColor = 'rgba(0,0,0,0.12)';
  context.shadowBlur = 6;
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = 'rgba(255,255,255,0.85)';
  context.stroke();
  context.restore();
}

function drawPoint(context, p, label, color) {
  context.save();
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(p.x, p.y, 7, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = '#1f2d3d';
  context.font = 'bold 16px sans-serif';
  context.fillText(label, p.x + 10, p.y - 10);
  context.restore();
}

// 【修改】移除“旋转中心”文字标注，当 label 为空时不绘制文字
function drawCenter(context, c, label = '', color = '#27ae60') {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.arc(c.x, c.y, 7, 0, Math.PI * 2);
  context.fill();
  if (label) {
    context.fillStyle = color;
    context.font = 'bold 15px sans-serif';
    context.fillText(label, c.x + 10, c.y + 5);
  }
  context.restore();
}

function drawSegment(context, A, B) {
  context.save();
  context.strokeStyle = '#2d6cdf';
  context.lineWidth = 4;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(A.x, A.y);
  context.lineTo(B.x, B.y);
  context.stroke();
  context.restore();
}

function drawTrail(context, points, color) {
  if (!points || points.length < 2) return;
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  points.forEach((p, i) => {
    if (i === 0) context.moveTo(p.x, p.y);
    else context.lineTo(p.x, p.y);
  });
  context.stroke();
  context.restore();
}

function resizeCanvas() {
  if (!starCanvas) return;
  const rect = starCanvas.getBoundingClientRect();
  starCanvas.width = rect.width;
  starCanvas.height = rect.height;
  state.width = starCanvas.width;
  state.height = starCanvas.height;

  const cx = Math.round(state.width / 2 / GRID) * GRID;
  const cy = Math.round(state.height / 2 / GRID) * GRID;

  state.center = { x: cx, y: cy };
  state.A = { x: cx - 2 * GRID, y: cy };
  state.B = { x: cx + 2 * GRID, y: cy };

  if (!state.O) {
    state.O = { x: cx, y: cy - 2 * GRID };
  }

  draw();
}

function initActivity2FixedStars() {
  if (!a2State.A || !a2State.B) return;
  // 【修改】严格按照老师提供的相对坐标重置星星位置
  a2State.fixedStars = [
    { x: a2State.A.x, y: a2State.A.y - 4 * GRID }, // 红色：A点上方4格
    { x: a2State.A.x - 4 * GRID, y: a2State.A.y }, // 紫色：A点左方4格
    { x: a2State.A.x, y: a2State.A.y + 4 * GRID }, // 蓝色：A点下方4格
    { x: a2State.B.x, y: a2State.B.y + 4 * GRID }, // 绿色：B点下方4格
    { x: a2State.B.x, y: a2State.B.y - 4 * GRID }  // 黄色：B点上方4格
  ];
}

function resizeA2Canvas() {
  if (!a2Canvas || !a2Ctx) return;
  const rect = a2Canvas.getBoundingClientRect();
  a2Canvas.width = rect.width;
  a2Canvas.height = rect.height;
  a2State.width = a2Canvas.width;
  a2State.height = a2Canvas.height;

  const cx = Math.round(a2State.width / 2 / GRID) * GRID;
  const cy = Math.round(a2State.height / 2 / GRID) * GRID;

  a2State.center = { x: cx, y: cy };
  
  // 【修改】A点放在正中心，B点在右侧4格。保证星星不超界
  a2State.A = { x: cx, y: cy }; 
  a2State.B = { x: cx + 4 * GRID, y: cy }; 

  initActivity2FixedStars();
  drawActivity2();
}

function drawActivity2() {
  if (!a2Ctx) return;

  a2Ctx.clearRect(0, 0, a2State.width, a2State.height);
  a2Ctx.fillStyle = '#f8fbff';
  a2Ctx.fillRect(0, 0, a2State.width, a2State.height);
  drawGrid(a2Ctx, a2State.width, a2State.height);

  const center = a2State.selectedCenterType === 'A' ? a2State.A : a2State.B;
  const A = rotatePoint(a2State.A, center, a2State.angle);
  const B = rotatePoint(a2State.B, center, a2State.angle);

  drawTrail(a2Ctx, a2State.trails.A, 'rgba(231, 76, 60, 0.45)');
  drawTrail(a2Ctx, a2State.trails.B, 'rgba(39, 174, 96, 0.45)');

  drawSegment(a2Ctx, A, B);
  drawPoint(a2Ctx, A, 'A', '#e74c3c');
  drawPoint(a2Ctx, B, 'B', '#e74c3c');
  drawCenter(a2Ctx, center, '', '#27ae60'); // 移除文字

  a2State.fixedStars.forEach((s, i) => drawStarShape(a2Ctx, s.x, s.y, STAR_COLORS[i % STAR_COLORS.length]));

  if (a2TrailA) a2State.activeTrail.A = a2TrailA.checked;
  if (a2TrailB) a2State.activeTrail.B = a2TrailB.checked;

  if (a2ModeLineBtn && a2Canvas) {
    a2Canvas.style.cursor = 'grab';
  }
}

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.fillStyle = '#f8fbff';
  ctx.fillRect(0, 0, state.width, state.height);

  drawGrid(ctx, state.width, state.height);

  const center = getCenterPoint();
  const A = rotatePoint(state.A, center, state.angle);
  const B = rotatePoint(state.B, center, state.angle);

  drawTrail(ctx, state.trails.A, 'rgba(231, 76, 60, 0.45)');
  drawTrail(ctx, state.trails.B, 'rgba(39, 174, 96, 0.45)');
  drawTrail(ctx, state.trails.O, 'rgba(244, 114, 182, 0.45)');

  if (state.trails.seg.length > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(45, 108, 223, 0.22)';
    ctx.lineWidth = 3;
    state.trails.seg.forEach(pair => {
      ctx.beginPath();
      ctx.moveTo(pair.A.x, pair.A.y);
      ctx.lineTo(pair.B.x, pair.B.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawSegment(ctx, A, B);
  drawPoint(ctx, A, 'A', '#e74c3c');
  drawPoint(ctx, B, 'B', '#e74c3c');

  if (state.activity3Page === 2 && state.hasO) {
    drawCenter(ctx, state.O, 'O点', '#f472b6');
  }

  drawCenter(ctx, center, '', '#27ae60'); // 移除文字

  state.stars.forEach((s, i) => drawStarShape(ctx, s.x, s.y, STAR_COLORS[i % STAR_COLORS.length]));

  // 【修改】已移除活动三状态提示文字（当前模式、星星数、角度等）的更新逻辑，配合HTML删除文字框，让画布更清爽
  // 下方的按钮和功能逻辑（如 activity3Page2Tools 等）均完整保留

  if (activity3Page2Tools) activity3Page2Tools.classList.toggle('hidden', state.activity3Page !== 2);
  if (oPointStatusWrap) oPointStatusWrap.classList.toggle('hidden', state.activity3Page !== 2);
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

function getSelectedCenterType() {
  const checked = document.querySelector('input[name="centerChoice"]:checked');
  return checked ? checked.value : 'A';
}

function getA2SelectedCenterType() {
  const checked = document.querySelector('input[name="a2CenterChoice"]:checked');
  return checked ? checked.value : 'A';
}

function setActivity3Page(page) {
  state.activity3Page = page;
  state.mode = page === 1 ? 'star' : 'line';

  if (page === 1) {
    state.selectedCenterType = 'A';
    const aRadio = document.querySelector('input[name="centerChoice"][value="A"]');
    if (aRadio) aRadio.checked = true;
  } else {
    if (state.hasO) {
      state.selectedCenterType = 'O';
      const oRadio = document.querySelector('input[name="centerChoice"][value="O"]');
      if (oRadio) oRadio.checked = true;
    } else {
      state.selectedCenterType = 'A';
      const aRadio = document.querySelector('input[name="centerChoice"][value="A"]');
      if (aRadio) aRadio.checked = true;
    }
  }

  setMsg('');
  draw();
}

function startAnimation() {
  if (state.animating) return;
  if (state.selectedCenterType === 'O' && !state.hasO) {
    setMsg('请先添加 O 点');
    return;
  }

  state.angle = 0;
  state.animating = true;
  setMsg('');

  const step = () => {
    state.angle += 2;
    const center = getCenterPoint();
    const A = rotatePoint(state.A, center, state.angle);
    const B = rotatePoint(state.B, center, state.angle);

    if (state.activeTrail.A) state.trails.A.push({ x: A.x, y: A.y });
    if (state.activeTrail.B) state.trails.B.push({ x: B.x, y: B.y });
    if (state.activeTrail.O && state.hasO) state.trails.O.push({ x: center.x, y: center.y });
    if (state.activeTrail.seg) state.trails.seg.push({ A: { ...A }, B: { ...B } });

    draw();

    if (state.angle >= 360) {
      state.angle = 360;
      draw();
      state.animating = false;
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
      setMsg('旋转一周完成');
      return;
    }
    state.rafId = requestAnimationFrame(step);
  };

  state.rafId = requestAnimationFrame(step);
}

function startA2Animation() {
  if (a2State.animating) return;
  a2State.angle = 0;
  a2State.animating = true;

  const step = () => {
    a2State.angle += 2;

    const center = a2State.selectedCenterType === 'A' ? a2State.A : a2State.B;
    const A = rotatePoint(a2State.A, center, a2State.angle);
    const B = rotatePoint(a2State.B, center, a2State.angle);

    if (a2TrailA?.checked) a2State.trails.A.push({ x: A.x, y: A.y });
    if (a2TrailB?.checked) a2State.trails.B.push({ x: B.x, y: B.y });

    drawActivity2();

    if (a2State.angle >= 360) {
      a2State.angle = 360;
      drawActivity2();
      a2State.animating = false;
      cancelAnimationFrame(a2State.rafId);
      a2State.rafId = null;
      return;
    }

    a2State.rafId = requestAnimationFrame(step);
  };

  a2State.rafId = requestAnimationFrame(step);
}

function stopAnimation() {
  state.animating = false;
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

function stopA2Animation() {
  a2State.animating = false;
  if (a2State.rafId) {
    cancelAnimationFrame(a2State.rafId);
    a2State.rafId = null;
  }
}

function resetAll() {
  stopAnimation();
  state.angle = 0;
  state.mode = 'star';
  state.stars = [];
  state.draggingStarIndex = -1;
  state.dragOffsetX = 0;
  state.dragOffsetY = 0;
  state.draggingLine = false;
  state.draggingO = false;
  state.lineDragOffset = { x: 0, y: 0 };
  state.trails = { A: [], B: [], O: [], seg: [] };
  state.selectedCenterType = 'A';
  state.hasO = false;
  state.awaitingOPlacement = false;
  if (state.center) {
    state.O = { x: state.center.x, y: state.center.y - 2 * GRID };
  }
  const aRadio = document.querySelector('input[name="centerChoice"][value="A"]');
  if (aRadio) aRadio.checked = true;
  setMsg('已恢复到初始状态');
  draw();
}

function resetA2All() {
  stopA2Animation();
  a2State.angle = 0;
  a2State.selectedCenterType = 'A';
  a2State.draggingLine = false;
  a2State.trails = { A: [], B: [] };
  if (a2TrailA) a2TrailA.checked = true;
  if (a2TrailB) a2TrailB.checked = true;
  
  drawActivity2();
}

function exportLineState() {
  const center = getCenterPoint();
  const A = rotatePoint(state.A, center, state.angle);
  const B = rotatePoint(state.B, center, state.angle);
  return {
    A: { x: A.x, y: A.y },
    B: { x: B.x, y: B.y },
    baseA: { x: state.A.x, y: state.A.y },
    baseB: { x: state.B.x, y: state.B.y },
    center: { x: center.x, y: center.y }
  };
}

// 【核心修改】活动三截图上传逻辑
async function submitActivity3ToServer(page) {
  try {
    setMsg('正在生成截图并提交...');
    
    // 1. 将当前画布生成 PNG 图片文件
    const blob = await new Promise(resolve => starCanvas.toBlob(resolve, 'image/png'));
    if (!blob) { setMsg('截图生成失败'); return; }
    const file = new File([blob], `activity3_page${page}.png`, { type: 'image/png' });

    // 2. 准备原有的状态数据
    const payload = {
      activity: 3, page, groupName: document.getElementById('groupSelect3')?.value || '',
      centerChoice: state.selectedCenterType, currentAngle: Math.round(state.angle), mode: state.mode,
      hasOPoint: state.hasO, oPoint: state.hasO ? { x: state.O.x, y: state.O.y } : null,
      oPointText: state.hasO ? `O点坐标：(${state.O.x}, ${state.O.y})` : '未添加',
      stars: state.stars.map(s => ({ x: s.x, y: s.y })),
      trailA: state.trails.A, trailB: state.trails.B, trailO: state.trails.O, trailSeg: state.trails.seg,
      lineState: exportLineState(), canvasSize: { width: state.width, height: state.height, grid: GRID },
      pageText: page === 1 ? '活动三第1页' : '活动三第2页'
    };

    // 3. 构造 FormData
    const formData = new FormData();
    formData.append('activity', '3'); 
    formData.append('page', String(page)); 
    formData.append('groupName', payload.groupName);
    formData.append('file', file); // 截图文件
    formData.append('workData', JSON.stringify(payload)); // 详细状态数据打包

    // 4. 提交到活动三专属接口
    const res = await fetch('/api/student/submit-work', { 
      method: 'POST', 
      headers: { 'Authorization': `Bearer ${studentToken}` }, 
      body: formData 
    });
    
    const data = await res.json();
    if (!res.ok) { 
      setMsg(data.message || '提交失败'); 
      return; 
    }
    setMsg(`活动三第 ${page} 页截图提交成功！`);
  } catch (err) { 
    console.error(err); 
    setMsg('网络错误，提交失败'); 
  }
}

welcomeEl.textContent = `欢迎你，${displayName || '同学'}！`;

document.querySelectorAll('input[name="centerChoice"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const next = getSelectedCenterType();
    if (next === 'O' && !state.hasO) {
      setMsg('请先添加 O 点');
      const aRadio = document.querySelector('input[name="centerChoice"][value="A"]');
      if (aRadio) aRadio.checked = true;
      return;
    }
    state.selectedCenterType = next;
    state.angle = 0;
    setMsg('');
    draw();
  });
});

document.querySelectorAll('input[name="a2CenterChoice"]').forEach(radio => {
  radio.addEventListener('change', () => {
    a2State.selectedCenterType = getA2SelectedCenterType();
    a2State.angle = 0;
    drawActivity2();
  });
});

trailA?.addEventListener('change', () => {
  state.activeTrail.A = trailA.checked;
  draw();
});
trailB?.addEventListener('change', () => {
  state.activeTrail.B = trailB.checked;
  draw();
});
trailSeg?.addEventListener('change', () => {
  state.activeTrail.seg = trailSeg.checked;
  draw();
});

a2TrailA?.addEventListener('change', () => {
  a2State.activeTrail.A = a2TrailA.checked;
  drawActivity2();
});
a2TrailB?.addEventListener('change', () => {
  a2State.activeTrail.B = a2TrailB.checked;
  drawActivity2();
});

modeStarBtn?.addEventListener('click', () => {
  state.mode = 'star';
  setMsg('');
  draw();
});
modeLineBtn?.addEventListener('click', () => {
  state.mode = 'line';
  setMsg('');
  draw();
});
clearTrailBtn?.addEventListener('click', () => {
  state.trails = { A: [], B: [], O: [], seg: [] };
  draw();
});

a2ModeLineBtn?.addEventListener('click', () => {
  a2State.selectedCenterType = getA2SelectedCenterType();
  drawActivity2();
});

a2ClearTrailBtn?.addEventListener('click', () => {
  a2State.trails = { A: [], B: [] };
  drawActivity2();
});

a2ResetBtn?.addEventListener('click', resetA2All);
resetBtn?.addEventListener('click', resetAll);
autoRunBtn?.addEventListener('click', () => startAnimation());
a2AutoRunBtn?.addEventListener('click', () => startA2Animation());

addOBtn?.addEventListener('click', () => {
  state.awaitingOPlacement = true;
  state.mode = 'line';
  setMsg('请点击网格点放置 O 点');
  draw();
});

pageNavBtn?.addEventListener('click', () => {
  const page1 = document.getElementById('activity1Page1');
  const page2 = document.getElementById('activity1Page2');

  if (state.activity1Step === 1) {
    state.activity1Step = 2;
    if (pageNavBtn) pageNavBtn.textContent = '上一页';
    // 【修改1】活动一任务二文本修改为逆时针
    if (taskText) taskText.textContent = '任务二：画出线段AB绕点A逆时针旋转90°后的线段并拍照上传。';
    if (page1) page1.classList.add('hidden');
    if (page2) page2.classList.remove('hidden');
  } else {
    state.activity1Step = 1;
    if (pageNavBtn) pageNavBtn.textContent = '下一页';
    if (taskText) taskText.textContent = '任务一：在方格纸上画出旋转后的线段AB并拍照上传';
    if (page1) page1.classList.remove('hidden');
    if (page2) page2.classList.add('hidden');
  }
  
  if (imageInput) imageInput.value = '';
  if (imageInfo) imageInfo.textContent = '未选择文件';
  if (previewImg) {
    previewImg.src = '';
    previewImg.classList.add('hidden');
  }
  if (msgEl) msgEl.textContent = '';
});

submitBtn?.addEventListener('click', async () => {
  const file = imageInput.files?.[0];
  const formData = new FormData();
  formData.append('activity', '1');
  formData.append('task', String(state.activity1Step));
  formData.append('groupName', document.getElementById('groupSelect')?.value || '');
  if (file) formData.append('file', file);

  try {
    const res = await fetch('/api/works', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`
      },
      body: formData
    });
    const data = await res.json();
    msgEl.textContent = res.ok ? '活动一照片已提交' : (data.message || '活动一提交失败');
  } catch (err) {
    msgEl.textContent = '活动一提交失败';
  }
});

submitStarBtn?.addEventListener('click', () => submitActivity3ToServer(state.activity3Page));

cameraBtn?.addEventListener('click', () => imageInput.click());
imageInput?.addEventListener('change', () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  imageInfo.textContent = file.name;
  previewImg.src = URL.createObjectURL(file);
  previewImg.classList.remove('hidden');
});

function canvasPoint(e) {
  const rect = starCanvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

starCanvas?.addEventListener('pointerdown', (e) => {
  e.preventDefault(); 
  const p = canvasPoint(e);

  if (state.activity3Page === 2 && state.awaitingOPlacement) {
    state.O = snapPoint(p);
    state.hasO = true;
    state.awaitingOPlacement = false;
    state.selectedCenterType = 'O';
    const oRadio = document.querySelector('input[name="centerChoice"][value="O"]');
    if (oRadio) oRadio.checked = true;
    setMsg('O 点已放置');
    draw();
    return;
  }

  if (state.mode === 'star') {
    const gridP = snapPoint(p);
    const idx = state.stars.findIndex(s => Math.hypot(s.x - gridP.x, s.y - gridP.y) < 35);

    if (idx >= 0) {
      state.draggingStarIndex = idx;
      state.dragOffsetX = state.stars[idx].x - gridP.x;
      state.dragOffsetY = state.stars[idx].y - gridP.y;
    } else {
      if (state.stars.length >= MAX_STARS) {
        setMsg('最多只能新增 5 颗星星');
        return;
      }
      state.stars.push({ x: gridP.x, y: gridP.y });
      state.draggingStarIndex = state.stars.length - 1;
      state.dragOffsetX = 0;
      state.dragOffsetY = 0;
    }
    draw();
    return;
  }

  if (state.mode === 'line') {
    const center = getCenterPoint();
    const A = rotatePoint(state.A, center, state.angle);
    const B = rotatePoint(state.B, center, state.angle);

    const dA = Math.hypot(A.x - p.x, A.y - p.y);
    const dB = Math.hypot(B.x - p.x, B.y - p.y);

    if (state.activity3Page === 2 && state.hasO) {
      const dO = Math.hypot(state.O.x - p.x, state.O.y - p.y);
      if (dO < 35) {
        state.draggingO = true;
        state.lineDragOffset = { x: p.x - state.O.x, y: p.y - state.O.y };
        return;
      }
    }

    // 【修改】记录初始拖拽角度，解决以B为中心时不流畅的问题
    if (dA < 35 || dB < 35) {
      state.draggingLine = true;
      state.dragStartAngle = Math.atan2(p.y - center.y, p.x - center.x);
      state.dragStartObjAngle = state.angle;
    }
  }
});

starCanvas?.addEventListener('pointermove', (e) => {
  e.preventDefault(); 
  const p = canvasPoint(e);

  if (state.mode === 'star' && state.draggingStarIndex >= 0) {
    state.stars[state.draggingStarIndex] = snapPoint({
      x: p.x + state.dragOffsetX,
      y: p.y + state.dragOffsetY
    });
    draw();
    return;
  }

  if (state.mode === 'line' && state.draggingO && state.activity3Page === 2 && state.hasO) {
    state.O = snapPoint({
      x: p.x - state.lineDragOffset.x,
      y: p.y - state.lineDragOffset.y
    });
    state.selectedCenterType = 'O';
    const oRadio = document.querySelector('input[name="centerChoice"][value="O"]');
    if (oRadio) oRadio.checked = true;
    draw();
    return;
  }

  // 【修改】使用角度增量计算，完美适配A/B/O任意中心点
  if (state.mode === 'line' && state.draggingLine) {
    const fixedCenter = getCenterPoint();
    const currentMouseAngle = Math.atan2(p.y - fixedCenter.y, p.x - fixedCenter.x);
    let deltaAngle = (currentMouseAngle - state.dragStartAngle) * 180 / Math.PI;
    state.angle = state.dragStartObjAngle + deltaAngle;
    draw();
  }
});

starCanvas?.addEventListener('pointerup', () => {
  state.draggingStarIndex = -1;
  state.draggingLine = false;
  state.draggingO = false;
});
starCanvas?.addEventListener('pointerleave', () => {
  state.draggingStarIndex = -1;
  state.draggingLine = false;
  state.draggingO = false;
});

if (a2Canvas) {
  a2Canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault(); 
    const rect = a2Canvas.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const center = a2State.selectedCenterType === 'A' ? a2State.A : a2State.B;
    const A = rotatePoint(a2State.A, center, a2State.angle);
    const B = rotatePoint(a2State.B, center, a2State.angle);
    
    // 【修改】记录初始拖拽角度
    if (Math.hypot(A.x - p.x, A.y - p.y) < 35 || Math.hypot(B.x - p.x, B.y - p.y) < 35) {
      a2State.draggingLine = true;
      a2State.dragStartAngle = Math.atan2(p.y - center.y, p.x - center.x);
      a2State.dragStartObjAngle = a2State.angle;
    }
  });

  a2Canvas.addEventListener('pointermove', (e) => {
    e.preventDefault(); 
    if (!a2State.draggingLine) return;
    const rect = a2Canvas.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const fixedCenter = a2State.selectedCenterType === 'A' ? a2State.A : a2State.B;
    
    // 【修改】使用角度增量计算
    const currentMouseAngle = Math.atan2(p.y - fixedCenter.y, p.x - fixedCenter.x);
    let deltaAngle = (currentMouseAngle - a2State.dragStartAngle) * 180 / Math.PI;
    a2State.angle = a2State.dragStartObjAngle + deltaAngle;
    drawActivity2();
  });

  a2Canvas.addEventListener('pointerup', () => {
    a2State.draggingLine = false;
  });
  a2Canvas.addEventListener('pointerleave', () => {
    a2State.draggingLine = false;
  });
}

function showPanel(activity) {
  if (activity1Panel) activity1Panel.classList.add('hidden');
  if (activity2Panel) activity2Panel.classList.add('hidden');
  if (activity3Panel) activity3Panel.classList.add('hidden');

  if (activity === 1 && activity1Panel) activity1Panel.classList.remove('hidden');
  if (activity === 2 && activity2Panel) activity2Panel.classList.remove('hidden');
  if (activity === 3 && activity3Panel) activity3Panel.classList.remove('hidden');

  if (activity === 3) {
    setTimeout(() => {
      resizeCanvas();
      draw();
    }, 50);
  }

  if (activity === 2) {
    setTimeout(() => {
      resizeA2Canvas();
      drawActivity2();
    }, 50);
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    showPanel(Number(tab.dataset.activity));
  });
});

activity3PrevBtn?.addEventListener('click', () => setActivity3Page(1));
activity3NextBtn?.addEventListener('click', () => setActivity3Page(2));

window.addEventListener('resize', () => {
  resizeCanvas();
  resizeA2Canvas();
});

showPanel(1);
resizeCanvas();
resizeA2Canvas();
