// Aplicación Principal - SPA Router

// Estado global de la aplicación
const app = {
  currentView: null,
  user: null
};

// Función helper para renderizar sidebar
function renderSidebar() {
  return `
    <div class="sidebar" id="sidebar">
      <div class="sidebar-brand">💰 Sistema de Créditos</div>
      <nav>
        <ul class="sidebar-menu">
          <li><a href="#/dashboard" data-link="dashboard"><span>📊</span> Dashboard</a></li>
          <li><a href="#/clients" data-link="clients"><span>👥</span> Clientes</a></li>
          <li><a href="#/credit-types" data-link="credit-types"><span>💳</span> Tipos de Crédito</a></li>
          <li><a href="#/loan-requests" data-link="loan-requests"><span>📝</span> Solicitudes</a></li>
          <li><a href="#/loans" data-link="loans"><span>💼</span> Préstamos</a></li>
          <li><a href="#/payments" data-link="payments"><span>💵</span> Pagos</a></li>
          <li><a href="#/reports" data-link="reports"><span>📈</span> Reportes</a></li>
          <li><a href="#/expenses" data-link="expenses"><span>📉</span> Gastos</a></li>
          <li><a href="#/settings" data-link="settings"><span>⚙️</span> Configuración</a></li>
        </ul>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <span class="sidebar-user-name" id="currentUser">Admin</span>
          <button class="btn btn-sm btn-outline" onclick="authAPI.logout()" style="width: 100%;">Salir</button>
        </div>
      </div>
    </div>
    <div class="main-content" id="main-content"></div>
  `;
}

function updateActiveLink(hash) {
  // Remover active de todos
  document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));

  // Agregar al actual
  const currentKey = hash.replace('#/', '') || 'dashboard';
  const activeLink = document.querySelector(`.sidebar-menu a[data-link="${currentKey}"]`);

  if (activeLink) activeLink.classList.add('active');
}

// Router simple
const routes = {
  '/login': {
    render: renderLogin,
    init: initLogin,
    requiresAuth: false
  },
  '/dashboard': {
    render: renderDashboard,
    init: initDashboard,
    requiresAuth: true
  },
  '/clients': {
    render: renderClients,
    init: initClients,
    requiresAuth: true
  },
  '/credit-types': {
    render: renderCreditTypes,
    init: initCreditTypes,
    requiresAuth: true
  },
  '/loan-requests': {
    render: renderLoanRequests,
    init: initLoanRequests,
    requiresAuth: true
  },
  '/loans': {
    render: renderLoans,
    init: initLoans,
    requiresAuth: true
  },
  '/payments': {
    render: renderPayments,
    init: initPayments,
    requiresAuth: true
  },
  '/reports': {
    render: renderReports,
    init: initReports,
    requiresAuth: true
  },
  '/expenses': {
    render: renderExpenses,
    init: initExpenses,
    requiresAuth: true
  },
  '/settings': {
    render: renderSettings,
    init: initSettings,
    requiresAuth: true
  }
};

// Función para navegar
async function navigate() {
  const hash = window.location.hash.slice(1) || '/dashboard';
  const route = routes[hash] || routes['/dashboard'];

  // Verificar autenticación
  const token = getToken();

  if (route.requiresAuth && !token) {
    window.location.hash = '#/login';
    return;
  }

  if (hash === '/login' && token) {
    window.location.hash = '#/dashboard';
    return;
  }

  try {
    const appElement = document.getElementById('app');

    // Manejo especial para Login (sin sidebar)
    if (hash === '/login') {
      appElement.innerHTML = await route.render();
      if (route.init) route.init();
      app.currentView = hash;
      return;
    }

    // Para vistas dashboard/app
    // Si no tenemos la estructura de sidebar (venimos de login o refresh), la creamos
    if (!document.getElementById('sidebar')) {
      appElement.innerHTML = renderSidebar();
    }

    // Actualizar link activo
    updateActiveLink(window.location.hash);

    // Renderizar CONTENIDO en main-content
    const content = await route.render();

    const mainContentContainer = document.getElementById('main-content');
    mainContentContainer.innerHTML = content;

    // Inicializar la vista
    if (route.init) {
      route.init();
    }

    // Scroll al top del contenido (opcional, usuario pidio que no brincara, pero cambiar de vista debería llevarte al inicio del contenido)
    // mainContentContainer.scrollTop = 0; 
    // window.scrollTo(0, 0); // Esto resetea el scroll de la ventana

    app.currentView = hash;
  } catch (error) {
    console.error('Error navegando:', error);
    const container = document.getElementById('main-content') || document.getElementById('app');
    container.innerHTML = `
      <div class="container">
        <div class="card">
          <div class="card-body">
            <h2 style="color: var(--danger);">Error</h2>
            <p>Ocurrió un error al cargar la página. Por favor, intente nuevamente.</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Recargar</button>
          </div>
        </div>
      </div>
    `;
  }
}

// Event listeners
window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

// Verificar autenticación al cargar
window.addEventListener('load', async () => {
  const token = getToken();
  if (token) {
    try {
      app.user = await authAPI.getCurrentUser();
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      removeToken();
      window.location.hash = '#/login';
    }
  }
});
