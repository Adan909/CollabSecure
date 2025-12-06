// Configuración de demo de autenticación (usuarios y política)
const PLAIN_USERS = {
    admin: 'duran123',
    ortega: 'ortega123'
};
const RATE_LIMIT = { maxAttempts: 5, windowMs: 60 * 1000, lockoutMs: 5 * 60 * 1000 };
let attempts = [];
let lockoutUntil = 0;

// Utilidades de seguridad
function now(){ return Date.now(); }
function sanitizeUsername(u){
    return (u || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}
async function sha256Hex(str){
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(digest);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function getHashedUsers(){
    const entries = Object.entries(PLAIN_USERS);
    const out = {};
    for(const [user, pass] of entries){
        // Simple "cifrado" (hash). En un backend real usaríamos salt + PBKDF.
        out[user] = await sha256Hex(pass);
    }
    return out;
}

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
    window.location.href = 'homepage.html';
} else {
    showLogin();
}

// Lógica de Envío del Formulario
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Rate limit y bloqueo
    const t = now();
    if (lockoutUntil && t < lockoutUntil){
        const mins = Math.ceil((lockoutUntil - t)/60000);
        errorEl.textContent = `Demasiados intentos. Intenta de nuevo en ~${mins} min.`;
        return;
    }
    attempts = attempts.filter(a => t - a < RATE_LIMIT.windowMs);
    attempts.push(t);
    if (attempts.length > RATE_LIMIT.maxAttempts){
        lockoutUntil = t + RATE_LIMIT.lockoutMs;
        errorEl.textContent = 'Demasiados intentos. Usuario bloqueado temporalmente.';
        return;
    }

    // Validación de entrada
    const rawUser = userInput.value;
    const user = sanitizeUsername(rawUser);
    const pass = (passInput.value || '').trim();
    if (user.length < 3 || user.length > 32){
        errorEl.textContent = 'Usuario inválido (3-32, alfanumérico . _ -).';
        userInput.focus();
        return;
    }
    if (pass.length < 6 || pass.length > 64){
        errorEl.textContent = 'Contraseña inválida (6-64 caracteres).';
        passInput.focus();
        return;
    }

    // Cifrado simple (hash) y autenticación
    const USERS_HASHED = await getHashedUsers();
    const passHash = await sha256Hex(pass);
    if (USERS_HASHED[user] && USERS_HASHED[user] === passHash) {
        sessionStorage.setItem('loggedIn', user);
        // Generar un token de sesión simple
        const token = await sha256Hex(user + ':' + t);
        sessionStorage.setItem('sessionToken', token);
        window.location.href = 'homepage.html';
        return;
    } else {
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