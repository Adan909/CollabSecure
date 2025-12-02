        // Usuarios permitidos
        const USERS = {
            admin: 'duran123',
            Ortega: 'ortega123'
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
            dashboardCard.classList.add('hidden');
            loginCard.classList.remove('hidden');
            passInput.value = '';
            userInput.focus();
        }

        // Mantener sesión en la sesión del navegador
        const savedUser = sessionStorage.getItem('loggedIn');
        if (savedUser) {
            // Si hay un usuario guardado, redirigimos al homepage
            window.location.href = 'homepage.html';
        } else {
            showLogin();
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const user = userInput.value.trim();
            const pass = passInput.value;
            // validar contra lista de usuarios
            if (USERS[user] && USERS[user] === pass) {
                sessionStorage.setItem('loggedIn', user);
                // En todos los casos enviamos al usuario al homepage
                window.location.href = 'homepage.html';
                return;
            } else {
                errorEl.textContent = 'Usuario o contraseña incorrectos.';
                // ligero feedback visual
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