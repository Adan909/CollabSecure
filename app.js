// Usuarios permitidos
const USERS = {
    // Usuario: Contraseña
    admin: 'duran123',
    ortega: 'ortega123' // Corregido a minúsculas para coincidir con la solicitud
};

const appTitle = 'CollabSecure - Panel de Administración';

const loginCard = document.getElementById('loginCard');
const dashboardCard = document.getElementById('dashboardCard');
const form = document.getElementById('loginForm');
const userInput = document.getElementById('user');
const passInput = document.getElementById('pass');
const errorEl = document.getElementById('error');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserEl = document.getElementById('currentUser');

function showDashboard(user) {
    loginCard.classList.add('hidden');
    dashboardCard.classList.remove('hidden');
    errorEl.textContent = '';
    if (currentUserEl) currentUserEl.textContent = user;
}

function showLogin() {
    // Si la página tiene un 'dashboardCard', este código es irrelevante
    // cuando solo estamos interesados en la redirección al homepage.
    // Lo mantendremos para consistencia con tu código original.
    if (dashboardCard) dashboardCard.classList.add('hidden');
    if (loginCard) loginCard.classList.remove('hidden');
    passInput.value = '';
    userInput.focus();
}

// Lógica de Mantenimiento de Sesión y Redirección Inicial
const savedUser = sessionStorage.getItem('loggedIn');
if (savedUser) {
    // Si hay un usuario guardado, redirigimos inmediatamente al homepage
    window.location.href = 'homepage.html';
} else {
    // Si no hay sesión, mostramos el formulario de login
    showLogin();
}

// Lógica de Envío del Formulario
form.addEventListener('submit', function (e) {
    e.preventDefault();
    const user = userInput.value.trim();
    const pass = passInput.value;

    // **1. Validación de Credenciales**
    if (USERS[user] && USERS[user] === pass) {
        // **2. Login Exitoso: Redirección al homepage**
        sessionStorage.setItem('loggedIn', user);
        window.location.href = 'homepage.html'; // Redirección al homepage
        return;
    } else {
        // **3. Login Denegado: Mensaje de error**
        errorEl.textContent = 'Usuario o contraseña incorrectos.';
        passInput.value = '';
        passInput.focus();
    }
});

if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
        sessionStorage.removeItem('loggedIn');
        showLogin();
    });
}