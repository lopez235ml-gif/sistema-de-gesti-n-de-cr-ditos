// Vista de Login

function renderLogin() {
  return `
    <div class="login-container">
      <div class="card login-card">
        <div class="login-header">
          <h1 class="login-title">Sistema de Créditos</h1>
          <p class="login-subtitle">Gestión de Préstamos y Cobranzas</p>
        </div>
        
        <form id="loginForm">
          <div class="form-group">
            <label class="form-label" for="username">Usuario</label>
            <input 
              type="text" 
              id="username" 
              class="form-input" 
              placeholder="Ingrese su usuario"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label" for="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              class="form-input" 
              placeholder="Ingrese su contraseña"
              required
            />
          </div>
          
          <div id="loginError" class="mb-2" style="color: var(--danger); display: none;"></div>
          
          <button type="submit" class="btn btn-primary" style="width: 100%;">
            Iniciar Sesión
          </button>
          
          <div class="mt-3 text-center">
             <a href="portal.html" style="color: var(--primary); text-decoration: none; font-size: var(--font-size-sm);">
                ¿Eres cliente? Ingresa al Portal
             </a>
          </div>
        </form>
        
        <div class="mt-3 text-center" style="color: var(--text-muted); font-size: var(--font-size-sm);">
          <p>Credenciales por defecto:</p>
          <p><strong>Usuario:</strong> admin | <strong>Contraseña:</strong> Admin123!</p>
        </div>
      </div>
    </div>
  `;
}

function initLogin() {
  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('loginError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      errorDiv.style.display = 'none';
      const response = await authAPI.login(username, password);

      setToken(response.token);
      window.location.hash = '#/dashboard';
    } catch (error) {
      errorDiv.textContent = error.message || 'Error al iniciar sesión';
      errorDiv.style.display = 'block';
    }
  });
}
