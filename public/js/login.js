const loginForm = document.getElementById('loginForm');
const roleSelect = document.getElementById('role');
const usernameSelect = document.getElementById('username');
const passwordInput = document.getElementById('password');
const msgEl = document.getElementById('msg');

function renderUserOptions() {
  const role = roleSelect ? roleSelect.value : 'student';
  usernameSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '请选择账号';
  usernameSelect.appendChild(placeholder);

  if (role === 'teacher') {
    const option = document.createElement('option');
    option.value = 'teacher';
    option.textContent = 'teacher';
    usernameSelect.appendChild(option);
  } else if (role === 'student') {
    // 【修改①】只保留第一到第十小组
    const numMap = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    for (let i = 1; i <= 10; i++) {
      const option = document.createElement('option');
      const name = `第${numMap[i-1]}小组`;
      option.value = name;
      option.textContent = name;
      usernameSelect.appendChild(option);
    }
  }

  usernameSelect.value = '';
}

renderUserOptions();

if(roleSelect) {
  roleSelect.addEventListener('change', () => {
    renderUserOptions();
    passwordInput.value = '';
    msgEl.textContent = '';
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.textContent = '';

    const role = roleSelect ? roleSelect.value.trim() : 'student';
    const username = usernameSelect.value.trim();
    const password = passwordInput.value.trim();

    if (!username) { msgEl.textContent = '请选择账号'; return; }
    if (!password) { msgEl.textContent = '请输入密码'; return; }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username, password })
      });

      const data = await res.json();
      if (!res.ok) { msgEl.textContent = data.message || '登录失败'; return; }

      const token = data.token;
      if (!token) { msgEl.textContent = '登录成功但未返回 token'; return; }

      if (role === 'teacher') {
        localStorage.setItem('teacherToken', token);
        localStorage.setItem('role', 'teacher');
        localStorage.setItem('username', data.username || username);
        if (data.displayName) localStorage.setItem('displayName', data.displayName);
        location.href = '/teacher.html';
      } else if (role === 'student') {
        localStorage.setItem('studentToken', token);
        localStorage.setItem('role', 'student');
        localStorage.setItem('username', data.username || username);
        if (data.displayName) localStorage.setItem('displayName', data.displayName);
        location.href = '/student.html';
      }
    } catch (err) {
      console.error(err);
      msgEl.textContent = '网络错误，登录失败';
    }
  });
}
