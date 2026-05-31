const loginForm = document.getElementById('loginForm');
const roleSelect = document.getElementById('role');
const usernameSelect = document.getElementById('username');
const passwordInput = document.getElementById('password');
const msgEl = document.getElementById('msg');

function renderUserOptions() {
  const role = roleSelect.value;
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
    for (let i = 1; i <= 20; i++) {
      const option = document.createElement('option');
      option.value = `student${i}`;
      option.textContent = `student${i}`;
      usernameSelect.appendChild(option);
    }
  }

  usernameSelect.value = '';
}

// 初始化账号列表
renderUserOptions();

// 切换身份时更新账号列表，并清空密码
roleSelect.addEventListener('change', () => {
  renderUserOptions();
  passwordInput.value = '';
  msgEl.textContent = '';
});

// 提交登录
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.textContent = '';

    const role = roleSelect.value.trim();
    const username = usernameSelect.value.trim();
    const password = passwordInput.value.trim();

    if (!role) {
      msgEl.textContent = '请选择身份';
      return;
    }

    if (!username) {
      msgEl.textContent = '请选择账号';
      return;
    }

    if (!password) {
      msgEl.textContent = '请输入密码';
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role,
          username,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        msgEl.textContent = data.message || '登录失败';
        return;
      }

      const token = data.token;

      if (!token) {
        msgEl.textContent = '登录成功但未返回 token';
        return;
      }

      if (role === 'teacher') {
        localStorage.setItem('teacherToken', token);
        localStorage.setItem('role', 'teacher');
        localStorage.setItem('username', data.username || username);
        if (data.displayName) localStorage.setItem('displayName', data.displayName);

        localStorage.removeItem('studentToken');
        localStorage.removeItem('studentCurrentActivity');
        localStorage.removeItem('studentCurrentTask');
        localStorage.removeItem('studentGroup');

        location.href = '/teacher.html';
      } else if (role === 'student') {
        localStorage.setItem('studentToken', token);
        localStorage.setItem('role', 'student');
        localStorage.setItem('username', data.username || username);
        if (data.displayName) localStorage.setItem('displayName', data.displayName);

        localStorage.removeItem('teacherToken');
        localStorage.removeItem('teacherCurrentActivity');

        location.href = '/student.html';
      } else {
        msgEl.textContent = '身份类型错误';
      }
    } catch (err) {
      console.error(err);
      msgEl.textContent = '网络错误，登录失败';
    }
  });
}