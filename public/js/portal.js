// Lógica del Portal de Clientes

const API_URL = '/api/portal';

// Estado
const state = {
    token: localStorage.getItem('portal_token'),
    client: JSON.parse(localStorage.getItem('portal_client') || 'null')
};

// Elementos DOM
const appElement = document.getElementById('app');

// Inicialización
function init() {
    if (state.token && state.client) {
        renderDashboard();
    } else {
        // Ya estamos en el login por defecto en el HTML, solo atacheamos evento
        attachLoginEvent();
    }
}

function attachLoginEvent() {
    const form = document.getElementById('portalLoginForm');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const id_number = document.getElementById('id_number').value;
    const phone_last4 = document.getElementById('phone_last4').value;
    const errorDiv = document.getElementById('loginError');

    try {
        errorDiv.style.display = 'none';

        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_number, phone_last4 })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Error de autenticación');

        // Guardar sesión
        localStorage.setItem('portal_token', data.token);
        localStorage.setItem('portal_client', JSON.stringify(data.client));
        state.token = data.token;
        state.client = data.client;

        renderDashboard();

    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_client');
    state.token = null;
    state.client = null;
    window.location.reload();
}

async function renderDashboard() {
    appElement.innerHTML = '<div class="portal-container"><p class="text-center">Cargando información...</p></div>';

    try {
        const response = await fetch(`${API_URL}/summary`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        // Calcular totales
        const activeLoans = data.active_loans || [];
        const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.amount, 0); // Simplificado sin intereses pendientes por ahora

        let html = `
            <div class="portal-container">
                <button class="btn btn-sm btn-outline portal-logout" onclick="logout()">Cerrar Sesión</button>
                
                <div class="portal-header">
                    <div class="portal-brand">Portal de Clientes</div>
                    <p style="color: var(--text-secondary);">Bienvenido, <strong>${state.client.full_name}</strong></p>
                </div>

                <!-- Resumen -->
                <div class="grid grid-2 mb-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <p class="stat-label">Deuda Total Activa</p>
                            <h2 class="stat-value" style="color: ${totalDebt > 0 ? 'var(--danger)' : 'var(--secondary)'}">
                                $${totalDebt.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </h2>
                            <small class="text-muted">Capital pendiente (estimado)</small>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-body text-center">
                            <p class="stat-label">Préstamos Activos</p>
                            <h2 class="stat-value">${activeLoans.length}</h2>
                        </div>
                    </div>
                </div>

                <!-- Préstamos Activos -->
                <h3 class="mb-2">Mis Préstamos Activos</h3>
                ${activeLoans.length > 0 ? activeLoans.map(loan => `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h3 class="card-title" style="font-size: 1.2rem;">${loan.credit_type_name}</h3>
                            <span class="badge ${loan.status === 'active' ? 'badge-success' : 'badge-danger'}">${loan.status}</span>
                        </div>
                        <div class="card-body">
                            <div class="grid grid-2">
                                <div>
                                    <p class="text-muted mb-1">Monto Original</p>
                                    <p class="font-weight-bold">$${loan.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div>
                                    <p class="text-muted mb-1">Fecha Inicio</p>
                                    <p>${new Date(loan.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p class="text-muted mb-1">Plazo</p>
                                    <p>${loan.term_months} meses</p>
                                </div>
                                <div>
                                    <p class="text-muted mb-1">Interés</p>
                                    <p>${loan.interest_rate}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('') : '<p class="text-muted mb-4">No tienes préstamos activos actualmente.</p>'}

                <!-- Historial Reciente (Últimos 5 pagos - Dummy por ahora si no viene de API, o usar history si viene) -->
                <!-- Para v1, solo mostramos préstamos pagados que viene en history -->
                
                ${data.history && data.history.length > 0 ? `
                    <h3 class="mb-2">Historial de Préstamos Pagados</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.history.map(h => `
                                    <tr>
                                        <td>${new Date(h.created_at).toLocaleDateString()}</td>
                                        <td>${h.credit_type_name}</td>
                                        <td>$${h.amount.toLocaleString('es-ES')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                <div class="mt-4 text-center">
                    <p class="text-muted small">Si tiene dudas sobre su saldo, por favor contáctenos.</p>
                </div>
            </div>
        `;

        appElement.innerHTML = html;

    } catch (error) {
        console.error(error);
        appElement.innerHTML = '<div class="container text-center"><p class="text-danger">Error cargando información. Intente nuevamente.</p><button class="btn btn-outline" onclick="logout()">Volver</button></div>';
    }
}

// Iniciar
window.addEventListener('load', init);
