const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'rotation-class-secret';

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const worksFile = path.join(dataDir, 'works.json');
const submissionsFile = path.join(dataDir, 'submissions.json');
const uploadDir = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(worksFile)) fs.writeFileSync(worksFile, JSON.stringify([], null, 2), 'utf-8');
if (!fs.existsSync(submissionsFile)) fs.writeFileSync(submissionsFile, JSON.stringify([], null, 2), 'utf-8');

const numMap = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

const defaultUsers = {
  teacher: [{ username: 'teacher', password: '123456', displayName: '教师' }],
  student: Array.from({ length: 20 }, (_, i) => {
    const name = `第${numMap[i]}小组`;
    return { username: name, password: '123456', displayName: name };
  })
};

function loadUsers() {
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2), 'utf-8');
    return defaultUsers;
  }
  try {
    const data = fs.readFileSync(usersFile, 'utf-8');
    let parsed = JSON.parse(data);
    let needSave = false;
    
    // 【核心修复】自动检测并迁移旧版 student1-20 账号
    if (parsed.student && parsed.student.some(u => u.username.startsWith('student'))) {
      parsed.student = defaultUsers.student;
      needSave = true;
    }
    if (!parsed.teacher || parsed.teacher.length === 0) {
      parsed.teacher = defaultUsers.teacher;
      needSave = true;
    }
    
    if (needSave) fs.writeFileSync(usersFile, JSON.stringify(parsed, null, 2), 'utf-8');
    
    return {
      teacher: Array.isArray(parsed.teacher) ? parsed.teacher : [],
      student: Array.isArray(parsed.student) ? parsed.student : []
    };
  } catch (err) {
    fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2), 'utf-8');
    return defaultUsers;
  }
}

function saveUsers(users) { fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8'); }
function loadWorks() { try { const d = JSON.parse(fs.readFileSync(worksFile, 'utf-8') || '[]'); return Array.isArray(d) ? d : []; } catch { fs.writeFileSync(worksFile, JSON.stringify([], null, 2), 'utf-8'); return []; } }
function saveWorks(list) { fs.writeFileSync(worksFile, JSON.stringify(list, null, 2), 'utf-8'); }
function loadSubmissions() { try { const d = JSON.parse(fs.readFileSync(submissionsFile, 'utf-8') || '[]'); return Array.isArray(d) ? d : []; } catch { fs.writeFileSync(submissionsFile, JSON.stringify([], null, 2), 'utf-8'); return []; } }
function saveSubmissions(list) { fs.writeFileSync(submissionsFile, JSON.stringify(list, null, 2), 'utf-8'); }

let users = loadUsers();
let works = loadWorks();
let submissions = loadSubmissions();

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: '未登录' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { return res.status(401).json({ message: 'Token 无效或已过期' }); }
}
function teacherOnly(req, res, next) { if (!req.user || req.user.role !== 'teacher') return res.status(403).json({ message: '无权限' }); next(); }
function studentOnly(req, res, next) { if (!req.user || req.user.role !== 'student') return res.status(403).json({ message: '无权限' }); next(); }

function createToken(user, role) { return jwt.sign({ username: user.username, role, displayName: user.displayName || user.username }, JWT_SECRET, { expiresIn: '7d' }); }

app.get('/api/public-users', (req, res) => {
  const role = req.query.role;
  if (!['teacher', 'student'].includes(role)) return res.status(400).json({ message: 'role 参数错误' });
  users = loadUsers();
  const list = (users[role] || []).map(u => ({ username: u.username, displayName: u.displayName || u.username }));
  res.json({ message: 'ok', users: list });
});

app.post('/api/login', (req, res) => {
  const { role, username, password } = req.body;
  if (!role || !username || !password) return res.status(400).json({ message: '请输入完整信息' });
  if (!['teacher', 'student'].includes(role)) return res.status(400).json({ message: '身份类型错误' });
  users = loadUsers();
  const foundUser = (users[role] || []).find(u => u.username === username && u.password === password);
  if (!foundUser) return res.status(401).json({ message: '用户名或密码错误' });
  res.json({ token: createToken(foundUser, role), role, username: foundUser.username, displayName: foundUser.displayName || foundUser.username });
});

app.get('/api/me', authRequired, (req, res) => res.json({ username: req.user.username, role: req.user.role, displayName: req.user.displayName }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname || '')}`)
});
const upload = multer({ storage });

app.post('/api/works', authRequired, studentOnly, upload.any(), (req, res) => {
  const { activity, task, title, content, groupName, centerChoice, lineState, fixedStars, answers } = req.body || {};
  if (!activity) return res.status(400).json({ message: '活动不能为空' });
  const files = Array.isArray(req.files) ? req.files : [];
  const firstFile = files[0] || null;
  const newWork = {
    id: Date.now().toString(), activity: Number(activity), task: task ? Number(task) : null,
    title: title || '', content: content || '', groupName: groupName || '',
    imageUrl: firstFile ? `/uploads/${firstFile.filename}` : '',
    files: files.map(f => ({ originalname: f.originalname, filename: f.filename, path: `/uploads/${f.filename}` })),
    studentUsername: req.user.username, studentName: req.user.displayName || req.user.username,
    createdAt: new Date().toLocaleString(), centerChoice: centerChoice || '',
    lineState: lineState ? JSON.parse(lineState) : null, fixedStars: fixedStars ? JSON.parse(fixedStars) : null, answers: answers ? JSON.parse(answers) : null
  };
  works.push(newWork); saveWorks(works);
  res.json({ message: '上传成功', work: newWork });
});

app.get('/api/works', authRequired, (req, res) => {
  const activity = req.query.activity ? Number(req.query.activity) : null;
  let result = works;
  if (req.user.role === 'student') result = result.filter(w => w.studentUsername === req.user.username);
  if (activity) result = result.filter(w => Number(w.activity) === activity);
  res.json(result);
});

app.delete('/api/works/:id', authRequired, teacherOnly, (req, res) => {
  const before = works.length; works = works.filter(w => w.id !== req.params.id);
  if (works.length === before) return res.status(404).json({ message: '作品不存在' });
  saveWorks(works); res.json({ message: '删除成功' });
});

app.delete('/api/works', authRequired, teacherOnly, (req, res) => {
  const activity = req.query.activity ? Number(req.query.activity) : null;
  if (!activity) return res.status(400).json({ message: '活动不能为空' });
  const before = works.length; works = works.filter(w => Number(w.activity) !== activity); saveWorks(works);
  res.json({ message: `已清空活动 ${activity} 的作品`, deletedCount: before - works.length });
});

app.post('/api/student/submit-work', authRequired, studentOnly, upload.any(), (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];
  const firstFile = files[0] || null;
  const imageUrl = firstFile ? `/uploads/${firstFile.filename}` : '';
  let body = req.body || {};
  if (body.workData) { try { body = { ...body, ...JSON.parse(body.workData) }; } catch (e) {} }
  const { activity, page, groupName, centerChoice, currentAngle, mode, stars, trailA, trailB, trailSeg, trailO, lineState, hasOPoint, oPoint, oPointText, canvasSize, pageText } = body;
  if (Number(activity) !== 3) return res.status(400).json({ message: '该接口仅用于任务三提交' });
  const record = {
    id: Date.now().toString(), studentUsername: req.user.username, studentName: req.user.displayName || req.user.username, role: 'student',
    activity: 3, page: Number(page || 1), groupName: groupName || '', imageUrl, centerChoice: centerChoice || 'A',
    currentAngle: Number(currentAngle || 0), mode: mode || 'star',
    stars: Array.isArray(stars) ? stars : [], trailA: Array.isArray(trailA) ? trailA : [], trailB: Array.isArray(trailB) ? trailB : [],
    trailSeg: Array.isArray(trailSeg) ? trailSeg : [], trailO: Array.isArray(trailO) ? trailO : [],
    lineState: lineState || null, hasOPoint: Boolean(hasOPoint), oPoint: oPoint || null, oPointText: oPointText || '',
    canvasSize: canvasSize || null, pageText: pageText || '', submittedAt: new Date().toLocaleString(), updatedAt: new Date().toISOString()
  };
  const idx = submissions.findIndex(item => item.studentUsername === record.studentUsername && Number(item.activity) === 3 && Number(item.page || 1) === record.page);
  if (idx >= 0) submissions[idx] = record; else submissions.push(record);
  saveSubmissions(submissions);
  res.json({ message: '提交成功', record });
});

app.get('/api/teacher/submissions', authRequired, teacherOnly, (req, res) => {
  const activity = req.query.activity ? Number(req.query.activity) : null;
  const page = req.query.page ? Number(req.query.page) : null;
  let result = submissions;
  if (activity) result = result.filter(item => Number(item.activity) === activity);
  if (page) result = result.filter(item => Number(item.page || 1) === page);
  res.json({ message: 'ok', submissions: result });
});

app.get('/api/teacher/submissions/:username', authRequired, teacherOnly, (req, res) => {
  const list = submissions.filter(item => item.studentUsername === req.params.username).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  if (!list.length) return res.status(404).json({ message: '未找到该学生提交记录' });
  res.json({ message: 'ok', record: list[0], submissions: list });
});

app.delete('/api/teacher/submissions/:id', authRequired, teacherOnly, (req, res) => {
  const before = submissions.length; submissions = submissions.filter(item => item.id !== req.params.id);
  if (submissions.length === before) return res.status(404).json({ message: '提交记录不存在' });
  saveSubmissions(submissions); res.json({ message: '删除成功' });
});

app.delete('/api/teacher/submissions', authRequired, teacherOnly, (req, res) => {
  const activity = req.query.activity ? Number(req.query.activity) : null;
  const page = req.query.page ? Number(req.query.page) : null;
  if (!activity) return res.status(400).json({ message: '活动不能为空' });
  const before = submissions.length;
  submissions = submissions.filter(item => {
    if (Number(item.activity) !== activity) return true;
    if (page && Number(item.page || 1) !== page) return true;
    return false;
  });
  saveSubmissions(submissions);
  res.json({ message: '清空成功', deletedCount: before - submissions.length });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on:`);
  console.log(`  本机访问: http://localhost:${PORT}`);
  console.log(`  局域网访问: http://你的电脑IP:${PORT}`);
});
