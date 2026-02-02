// Vista de Dashboard

async function renderDashboard() {
  try {
    const [loans, payments, overdueLoans, clients] = await Promise.all([
      loansAPI.getAll({ status: 'active' }),
      paymentsAPI.getAll(),
      paymentsAPI.getOverdue(),
      clientsAPI.getAll()
    ]);

    const totalActive = loans.length;
    const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalOverdue = overdueLoans.length;
    const recentPayments = payments.slice(0, 5);

    return `
      <div class="container">
          <h1 class="mb-4" style="font-size: var(--font-size-3xl); font-weight: 700;">Dashboard</h1>
          
          <div class="grid grid-4 mb-4">
            <div class="stat-card">
              <div class="stat-label">Préstamos Activos</div>
              <div class="stat-value">${totalActive}</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-label">Monto Total</div>
              <div class="stat-value">$${totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-label">Clientes</div>
              <div class="stat-value">${clients.length}</div>
            </div>
            
            <div class="stat-card" style="border: 2px solid var(--danger);">
              <div class="stat-label">En Mora</div>
              <div class="stat-value" style="color: var(--danger);">${totalOverdue}</div>
            </div>
          </div>

          <div class="grid grid-2">
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Préstamos Activos</h2>
                <a href="#/loans" class="btn btn-sm btn-primary">Ver Todos</a>
              </div>
              <div class="card-body">
                ${loans.length > 0 ? `
                  <div class="table-container">
                    <table class="table">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Monto</th>
                          <th>Tipo</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${loans.slice(0, 5).map(loan => `
                          <tr>
                            <td>${loan.client_name}</td>
                            <td>$${loan.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                            <td>${loan.credit_type_name}</td>
                            <td><span class="badge badge-success">${loan.status}</span></td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : '<p style="color: var(--text-muted);">No hay préstamos activos</p>'}
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Pagos Recientes</h2>
                <a href="#/payments" class="btn btn-sm btn-secondary">Ver Todos</a>
              </div>
              <div class="card-body">
                ${recentPayments.length > 0 ? `
                  <div class="table-container">
                    <table class="table">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Monto</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${recentPayments.map(payment => `
                          <tr>
                            <td>${payment.client_name}</td>
                            <td>$${payment.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                            <td>${new Date(payment.payment_date).toLocaleDateString('es-ES')}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : '<p style="color: var(--text-muted);">No hay pagos registrados</p>'}
              </div>
            </div>
          </div>

          ${totalOverdue > 0 ? `
            <div class="card mt-4" style="border: 2px solid var(--danger);">
              <div class="card-header">
                <h2 class="card-title" style="color: var(--danger);">⚠️ Clientes en Mora</h2>
                <a href="#/payments" class="btn btn-sm btn-danger">Gestionar</a>
              </div>
              <div class="card-body">
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Teléfono</th>
                        <th>Días de Atraso</th>
                        <th>Próximo Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${overdueLoans.slice(0, 5).map(loan => `
                        <tr>
                          <td>${loan.client_name}</td>
                          <td>${loan.phone || 'N/A'}</td>
                          <td><span class="badge badge-danger">${loan.days_late} días</span></td>
                          <td>${new Date(loan.next_payment_date).toLocaleDateString('es-ES')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
    `;
  } catch (error) {
    console.error('Error cargando dashboard:', error);
    return '<div class="container"><p style="color: var(--danger);">Error cargando el dashboard</p></div>';
  }
}

async function initDashboard() {
  try {
    const user = await authAPI.getCurrentUser();
    const userElement = document.getElementById('currentUser');
    if (userElement) {
      userElement.textContent = user.username;
    }
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
  }
}
