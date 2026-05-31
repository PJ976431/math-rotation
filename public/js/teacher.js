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

  // 点击遮罩层背景或关闭按钮时关闭
  lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay || e.target.classList.contains('lightbox-close')) {
      lightboxOverlay.classList.remove('active');
    }
  });
}

// 挂载到 window，供 HTML 中的 onclick 调用
window.openLightbox = function(src) {
  const img = lightboxOverlay.querySelector('img');
  img.src = src;
  lightboxOverlay.classList.add('active');
};
// ==========================================

let currentActivity = Number(localStorage.getItem('teacherCurrentActivity')) || 1;
let pollInterval = null; 

const activityMap = {
  1: '活动一',
  2: '活动二',
  3: '活动三'
};

const taskMap = {
  1: '任务一',
  2: '任务二'
};

const colorMap = {
  '红色': '#ef4444',
  '紫色': '#a855f7',
  '蓝色': '#3b82f6',
  '绿色': '#22c55e',
  '黄色': '#eab308'
};

if(welcomeEl) welcomeEl.textContent = `当前账号：${username}`;

function updateActivityUI() {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.activity) === currentActivity);
  });
  localStorage.setItem('teacherCurrentActivity', String(currentActivity));

  if (submissionWrapper) {
    submissionWrapper.style.display = currentActivity === 3 ? 'block' : 'none';
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
  if (currentActivity !== 3) {
    return;
  }

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
    
    // 【修改】使用 openLightbox(this.src) 替代 window.open
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

  works.forEach(work => {
    section.appendChild(createWorkCard(work, true));
  });

  worksEl.appendChild(section);
}

function renderOtherActivityWorks(list) {
  list.forEach(work => {
    worksEl.appendChild(createWorkCard(work, false));
  });
}

function createWorkCard(work, isActivity1) {
  const card = document.createElement('div');
  card.className = 'work-card';

  const metaHtml = isActivity1
    ? `
      <span>活动一</span>
      <span>${taskMap[work.task] || '未知任务'}</span>
      <span>👥 ${work.groupName || '未分组'}</span>
      <span>👤 ${work.studentName || work.studentUsername}</span>
    `
    : `
      <span>${activityMap[work.activity] || '未知活动'}</span>
      <span>👥 ${work.groupName || '未分组'}</span>
      <span>👤 ${work.studentName || work.studentUsername}</span>
    `;

  let answersHtml = '';
  if (work.activity === 2 && work.answers && Array.isArray(work.answers)) {
    answersHtml = `
      <div style="margin-bottom: 12px; padding: 10px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13px; line-height: 1.8; color: #475569;">
        <strong style="color:#334155;">📝 旋转过程：</strong>
        <ul style="margin: 4px 0 0; padding-left: 18px;">
          ${work.answers.map((ans, i) => {
            const colorStyle = colorMap[ans.color] || '#334155';
            return `
              <li>
                以 <strong style="color:#2563eb;">${ans.center || '?'}</strong> 为中心，
                <strong>${ans.direction || '?'}</strong> 转 
                <strong style="color:#d97706;">${ans.angle || '?'}</strong>° 碰 
                <strong style="color:${colorStyle};">${ans.color || '?'}</strong> 星。
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }

  // 【修改】使用 openLightbox(this.src) 替代 window.open
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
    if (confirm('确定删除该作品吗？')) {
      await deleteWork(work.id);
    }
  });

  return card;
}

async function deleteWork(id) {
  try {
    const res = await fetch(`/api/works/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      if(msgEl) msgEl.textContent = data.message || '删除失败';
      return;
    }

    if(msgEl) msgEl.textContent = data.message || '删除成功';
    fetchWorks();
  } catch (err) {
    if(msgEl) msgEl.textContent = '网络错误';
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    fetchWorks(true); 
    if (currentActivity === 3) {
      fetchSubmissions(true);
    }
  }, 3000); 
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentActivity = Number(btn.dataset.activity);
    updateActivityUI();
    fetchWorks(); 
  });
});

if(refreshBtn) {
  refreshBtn.addEventListener('click', () => fetchWorks());
}

if(clearBtn) {
  clearBtn.addEventListener('click', async () => {
    if (currentActivity === 3) {
      if (!confirm('确定清空活动三的所有提交记录吗？')) return;
      try {
        const res = await fetch(`/api/teacher/submissions?activity=3`, {
          method: 'DELETE', 
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
          if(msgEl) msgEl.textContent = data.message || '清空失败';
          return;
        }
        if(msgEl) msgEl.textContent = data.message || '清空成功';
        fetchSubmissions();
      } catch (err) {
        if(msgEl) msgEl.textContent = '网络错误';
      }
      return;
    }

    if (!confirm(`确定清空 ${activityMap[currentActivity]} 的所有作品吗？`)) return;

    try {
      const res = await fetch(`/api/works?activity=${currentActivity}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        if(msgEl) msgEl.textContent = data.message || '清空失败';
        return;
      }

      if(msgEl) msgEl.textContent = data.message || '清空成功';
      fetchWorks();
    } catch (err) {
      if(msgEl) msgEl.textContent = '网络错误';
    }
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
