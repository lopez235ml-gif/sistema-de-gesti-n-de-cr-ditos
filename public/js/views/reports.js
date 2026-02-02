// Vista de Reportes

let currentPeriod = 'month';

async function renderReports() {
  try {
    const [portfolio, collections, interest, overdue] = await Promise.all([
      reportsAPI.getPortfolioSummary(),
      reportsAPI.getCollectionMetrics(currentPeriod),
      reportsAPI.getInterestAnalysis(),
      reportsAPI.getOverdueAnalysis()
    ]);

    return `
      <div class="container">
        <div class="flex-between mb-4">
          <h1 style="font-size: var(--font-size-3xl); font-weight: 700;">📊 Reportes</h1>
          <select id="periodFilter" class="form-select" style="width: 200px;" onchange="changePeriod(this.value)">
            <option value="today" ${currentPeriod === 'today' ? 'selected' : ''}>Hoy</option>
            <option value="week" ${currentPeriod === 'week' ? 'selected' : ''}>Esta Semana</option>
            <option value="month" ${currentPeriod === 'month' ? 'selected' : ''}>Este Mes</option>
          </select>
        </div>

        <!-- Tarjetas de Resumen -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-lg); margin-bottom: var(--spacing-xl);">
          
          <!-- Total Prestado -->
          <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
            <div class="card-body">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                  <p style="opacity: 0.9; margin: 0; font-size: var(--font-size-sm);">Total Prestado</p>
                  <h2 style="margin: var(--spacing-sm) 0; font-size: var(--font-size-3xl); font-weight: 700;">
                    $${portfolio.totalLent.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </h2>
                  <p style="opacity: 0.8; margin: 0; font-size: var(--font-size-sm);">
                    ${portfolio.activeLoansCount} préstamos activos
                  </p>
                </div>
                <div style="font-size: 2.5rem; opacity: 0.3;">💰</div>
              </div>
            </div>
          </div>

          <!-- Total Cobrado -->
          <div class="card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none;">
            <div class="card-body">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                  <p style="opacity: 0.9; margin: 0; font-size: var(--font-size-sm);">Total Cobrado</p>
                  <h2 style="margin: var(--spacing-sm) 0; font-size: var(--font-size-3xl); font-weight: 700;">
                    $${portfolio.totalCollected.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </h2>
                  <p style="opacity: 0.8; margin: 0; font-size: var(--font-size-sm);">
                    ${portfolio.recoveryRate}% recuperado
                  </p>
                </div>
                <div style="font-size: 2.5rem; opacity: 0.3;">✅</div>
              </div>
            </div>
          </div>

          <!-- Cartera Vencida -->
          <div class="card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; border: none;">
            <div class="card-body">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                  <p style="opacity: 0.9; margin: 0; font-size: var(--font-size-sm);">Cartera Vencida</p>
                  <h2 style="margin: var(--spacing-sm) 0; font-size: var(--font-size-3xl); font-weight: 700;">
                    $${overdue.overdueAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </h2>
                  <p style="opacity: 0.8; margin: 0; font-size: var(--font-size-sm);">
                    ${overdue.overdueCount} clientes en mora
                  </p>
                </div>
                <div style="font-size: 2.5rem; opacity: 0.3;">⚠️</div>
              </div>
            </div>
          </div>

          <!-- Intereses Ganados -->
          <div class="card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border: none;">
            <div class="card-body">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                  <p style="opacity: 0.9; margin: 0; font-size: var(--font-size-sm);">Intereses Ganados</p>
                  <h2 style="margin: var(--spacing-sm) 0; font-size: var(--font-size-3xl); font-weight: 700;">
                    $${interest.totalCollected.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </h2>
                  <p style="opacity: 0.8; margin: 0; font-size: var(--font-size-sm);">
                    $${interest.thisMonthInterest.toLocaleString('es-ES', { minimumFractionDigits: 2 })} este mes
                  </p>
                </div>
                <div style="font-size: 2.5rem; opacity: 0.3;">📈</div>
              </div>
            </div>
          </div>

        </div>

        <!-- Cobros del Periodo -->
        <div class="card mb-4">
          <div class="card-header">
            <h2 class="card-title">Cobros del Periodo (${getPeriodLabel(currentPeriod)})</h2>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-lg); margin-bottom: var(--spacing-lg);">
              <div>
                <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Número de Pagos</p>
                <p style="font-size: var(--font-size-2xl); font-weight: 700; margin: var(--spacing-xs) 0;">
                  ${collections.paymentsCount}
                </p>
              </div>
              <div>
                <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Total Recibido</p>
                <p style="font-size: var(--font-size-2xl); font-weight: 700; margin: var(--spacing-xs) 0;">
                  $${collections.totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Capital Cobrado</p>
                <p style="font-size: var(--font-size-2xl); font-weight: 700; margin: var(--spacing-xs) 0;">
                  $${collections.totalPrincipal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Intereses Cobrados</p>
                <p style="font-size: var(--font-size-2xl); font-weight: 700; margin: var(--spacing-xs) 0;">
                  $${collections.totalInterest.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Análisis de Mora -->
        ${overdue.overdueCount > 0 ? `
          <div class="card mb-4" style="border: 2px solid var(--danger);">
            <div class="card-header">
              <h2 class="card-title" style="color: var(--danger);">⚠️ Análisis de Cartera Vencida</h2>
            </div>
            <div class="card-body">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-lg); margin-bottom: var(--spacing-lg);">
                <div>
                  <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Monto en Mora</p>
                  <p style="font-size: var(--font-size-2xl); font-weight: 700; margin: var(--spacing-xs) 0; color: var(--danger);">
                    $${overdue.overdueAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">% de Cartera</p>
                  <p style="font-size: var(--font-size-2xl); font-weight: 700; margin: var(--spacing-xs) 0; color: var(--danger);">
                    ${overdue.overduePercentage.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Clientes en Mora</p>
                  <p style="font-size: var(--font-size-2xl); font-weight: 700; margin: var(--spacing-xs) 0; color: var(--danger);">
                    ${overdue.overdueCount}
                  </p>
                </div>
                <div>
                  <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Días Promedio</p>
                  <p style="font-size: var(--font-size-2xl); font-weight: 700; margin: var(--spacing-xs) 0; color: var(--danger);">
                    ${overdue.averageDaysLate} días
                  </p>
                </div>
              </div>

              ${overdue.overdueLoans.length > 0 ? `
                <h3 style="margin-top: var(--spacing-lg); margin-bottom: var(--spacing-md);">Top 10 Clientes en Mora</h3>
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Saldo Pendiente</th>
                        <th>Días de Atraso</th>
                        <th>Pagos Faltantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${overdue.overdueLoans.map(loan => `
                        <tr>
                          <td><strong>${loan.clientName}</strong></td>
                          <td>$${loan.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td><span class="badge badge-danger">${loan.daysLate} días</span></td>
                          <td>${loan.paymentsMissed}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Resumen de Cartera -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Resumen de Cartera</h2>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-lg);">
              <div style="padding: var(--spacing-md); background: var(--bg-tertiary); border-radius: var(--border-radius-sm);">
                <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Saldo Pendiente</p>
                <p style="font-size: var(--font-size-xl); font-weight: 700; margin: var(--spacing-xs) 0;">
                  $${portfolio.totalPending.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div style="padding: var(--spacing-md); background: var(--bg-tertiary); border-radius: var(--border-radius-sm);">
                <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Intereses Pendientes</p>
                <p style="font-size: var(--font-size-xl); font-weight: 700; margin: var(--spacing-xs) 0;">
                  $${interest.totalPending.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div style="padding: var(--spacing-md); background: var(--bg-tertiary); border-radius: var(--border-radius-sm);">
                <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Préstamos Pagados</p>
                <p style="font-size: var(--font-size-xl); font-weight: 700; margin: var(--spacing-xs) 0;">
                  ${portfolio.paidLoansCount}
                </p>
              </div>
              <div style="padding: var(--spacing-md); background: var(--bg-tertiary); border-radius: var(--border-radius-sm);">
                <p style="color: var(--text-muted); margin: 0; font-size: var(--font-size-sm);">Mora Cobrada</p>
                <p style="font-size: var(--font-size-xl); font-weight: 700; margin: var(--spacing-xs) 0;">
                  $${portfolio.totalLateFees.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error cargando reportes:', error);
    return `
      <div class="container">
        <div class="container">
          <p style="color: var(--danger);">Error cargando reportes</p>
        </div>
      </div>
    `;
  }
}

function getPeriodLabel(period) {
  const labels = {
    'today': 'Hoy',
    'week': 'Esta Semana',
    'month': 'Este Mes'
  };
  return labels[period] || 'Este Mes';
}

async function changePeriod(period) {
  currentPeriod = period;
  // Usar main-content para no borrar el sidebar
  const containerElement = document.getElementById('main-content');
  const content = await renderReports();
  containerElement.innerHTML = content;
  initReports();
}

function initReports() {
  // Inicialización si es necesaria
}
