const PANEL_SESSION_KEY = 'ev-couple-panel-auth';
const PANEL_CREDENTIALS = {
  email: 'novios@boda.com',
  password: 'VictoriaEmanuel2026!',
};
const PANEL_DASHBOARD_ROUTE = 'panel-novios.html';

const loginForm = document.getElementById('panel-login-form');
const loginStatus = document.getElementById('panel-login-status');

function setLoginStatus(message) {
  if (!loginStatus) return;

  if (!message) {
    loginStatus.hidden = true;
    loginStatus.textContent = '';
    return;
  }

  loginStatus.hidden = false;
  loginStatus.textContent = message;
}

function isAuthenticated() {
  return sessionStorage.getItem(PANEL_SESSION_KEY) === '1';
}

function goToDashboard() {
  window.location.href = PANEL_DASHBOARD_ROUTE;
}

if (isAuthenticated()) {
  goToDashboard();
}

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const email = (formData.get('email') || '').toString().trim().toLowerCase();
    const password = (formData.get('password') || '').toString();

    const emailMatches = email === PANEL_CREDENTIALS.email.toLowerCase();
    const passwordMatches = password === PANEL_CREDENTIALS.password;

    if (!emailMatches || !passwordMatches) {
      setLoginStatus('Credenciales invalidas. Verifica correo y contrasena.');
      return;
    }

    sessionStorage.setItem(PANEL_SESSION_KEY, '1');
    setLoginStatus('');
    goToDashboard();
  });
}
