// Vista de Préstamos

let loansData = [];

async function renderLoans() {
  try {
    loansData = await loansAPI.getAll();

    return `
      <div class="container">
          <h1 class="mb-4" style="font-size: var(--font-size-3xl); font-weight: 700;">Gestión de Préstamos</h1>

          <div class="card">
            <div class="card-body">

              <div class="form-group mb-4" style="display: flex; gap: var(--spacing-sm);">
                <input 
                  type="text" 
                  id="searchLoans" 
                  class="form-input" 
                  placeholder="Buscar préstamos por cliente, ID o tipo..."
                  onkeyup="filterLoans()"
                  style="flex: 1;"
                />
                <button class="btn btn-outline" onclick="toggleFilters()">
                  Filtros Avanzados ▼
                </button>
              </div>

              <div id="advancedFilters" class="card mb-4" style="display: none; background: var(--bg-secondary); border: 1px solid var(--border-color);">
                <div class="card-body">
                  <div class="grid grid-3">
                    <div class="form-group">
                      <label class="form-label">Estado</label>
                      <select id="filterStatus" class="form-select" onchange="filterLoans()">
                        <option value="">Todos</option>
                        <option value="active">Activo</option>
                        <option value="paid">Pagado</option>
                        <option value="defaulted">En Mora</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Fecha Aprobación (Desde)</label>
                      <input type="date" id="filterDateFrom" class="form-input" onchange="filterLoans()">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Fecha Aprobación (Hasta)</label>
                      <input type="date" id="filterDateTo" class="form-input" onchange="filterLoans()">
                    </div>
                  </div>
                  <div class="grid grid-2">
                     <div class="form-group">
                      <label class="form-label">Monto Mínimo</label>
                      <input type="number" id="filterAmountMin" class="form-input" placeholder="0" onkeyup="filterLoans()">
                    </div>
                     <div class="form-group">
                      <label class="form-label">Monto Máximo</label>
                      <input type="number" id="filterAmountMax" class="form-input" placeholder="Sin límite" onkeyup="filterLoans()">
                    </div>
                  </div>
                  <div class="text-right mt-2">
                    <button class="btn btn-sm btn-outline" onclick="clearFilters()">Limpiar Filtros</button>
                  </div>
                </div>
              </div>

              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Tipo</th>
                      <th>Monto</th>
                      <th>Tasa</th>
                      <th>Plazo</th>
                      <th>Estado</th>
                      <th>Fecha Aprobación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody id="loansTableBody">
                    ${renderLoansTable(loansData)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      
      <div id="loanDetailModal" style="display: none;"></div>
    `;
  } catch (error) {
    console.error('Error cargando préstamos:', error);
    return `
      <div class="container">
        <div class="container">
          <p style="color: var(--danger);">Error cargando préstamos</p>
        </div>
      </div>
    `;
  }
}

function renderLoansTable(loans) {
  if (loans.length === 0) {
    return '<tr><td colspan="9" class="text-center">No se encontraron préstamos</td></tr>';
  }

  return loans.map(loan => `
    <tr>
      <td>#${loan.id}</td>
      <td>${loan.client_name}</td>
      <td>${loan.credit_type_name}</td>
      <td>$${loan.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
      <td>${loan.interest_rate}%</td>
      <td>${loan.term_months} meses</td>
      <td>
        <span class="badge ${loan.status === 'active' ? 'badge-success' :
      loan.status === 'paid' ? 'badge-info' : 'badge-danger'
    }">
          ${loan.status}
        </span>
      </td>
      <td>${new Date(loan.approved_date).toLocaleDateString('es-ES')}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewLoanDetails(${loan.id})">Ver Detalle</button>
      </td>
    </tr>
  `).join('');
}

function filterLoans() {
  const search = document.getElementById('searchLoans').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const dateFrom = document.getElementById('filterDateFrom').value;
  const dateTo = document.getElementById('filterDateTo').value;
  const amountMin = parseFloat(document.getElementById('filterAmountMin').value) || 0;
  const amountMax = parseFloat(document.getElementById('filterAmountMax').value) || Infinity;

  const filtered = loansData.filter(loan => {
    // Texto
    const matchesSearch =
      loan.client_name.toLowerCase().includes(search) ||
      loan.id.toString().includes(search) ||
      loan.credit_type_name.toLowerCase().includes(search);

    // Estado
    const matchesStatus = !status || loan.status === status;

    // Fechas
    const loanDate = new Date(loan.approved_date);
    const matchesDateFrom = !dateFrom || loanDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || loanDate <= new Date(dateTo + 'T23:59:59'); // Incluir todo el día final

    // Monto
    const matchesAmount = loan.amount >= amountMin && loan.amount <= amountMax;

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesAmount;
  });

  document.getElementById('loansTableBody').innerHTML = renderLoansTable(filtered);
}

function toggleFilters() {
  const filters = document.getElementById('advancedFilters');
  const isHidden = filters.style.display === 'none';
  filters.style.display = isHidden ? 'block' : 'none';
}

function clearFilters() {
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';
  document.getElementById('filterAmountMin').value = '';
  document.getElementById('filterAmountMax').value = '';
  document.getElementById('searchLoans').value = ''; // Opcional: limpiar búsqueda de texto también?

  filterLoans();
}

async function viewLoanDetails(id) {
  try {
    const [loan, schedule] = await Promise.all([
      loansAPI.getById(id),
      loansAPI.getSchedule(id)
    ]);

    const modal = document.getElementById('loanDetailModal');

    modal.innerHTML = `
      <div class="modal-overlay" onclick="closeLoanDetailModal(event)">
        <div class="modal" onclick="event.stopPropagation()" style="max-width: 900px;">
          <div class="modal-header">
            <h2 class="modal-title">Detalle del Préstamo #${loan.id}</h2>
            <button class="btn btn-sm" onclick="closeLoanDetailModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="grid grid-2 mb-4">
              <div>
                <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md);">Información del Cliente</h3>
                <p><strong>Nombre:</strong> ${loan.client_name}</p>
                <p><strong>Identificación:</strong> ${loan.id_number}</p>
                <p><strong>Teléfono:</strong> ${loan.phone || 'N/A'}</p>
                <p><strong>Email:</strong> ${loan.email || 'N/A'}</p>
              </div>
              <div>
                <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md);">Información del Préstamo</h3>
                <p><strong>Tipo:</strong> ${loan.credit_type_name}</p>
                <p><strong>Monto:</strong> $${loan.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                <p><strong>Tasa:</strong> ${loan.interest_rate}%</p>
                <p><strong>Plazo:</strong> ${loan.term_months} meses</p>
                <p><strong>Balance:</strong> $${loan.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md);">Tabla de Amortización</h3>
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha Vencimiento</th>
                    <th>Cuota</th>
                    <th>Principal</th>
                    <th>Interés</th>
                    <th>Balance</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${schedule.map(item => `
                    <tr style="${item.paid ? 'background: rgba(16, 185, 129, 0.1);' : ''}">
                      <td>${item.payment_number}</td>
                      <td>${new Date(item.due_date).toLocaleDateString('es-ES')}</td>
                      <td>$${item.payment_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>$${item.principal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>$${item.interest.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>$${item.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>
                        ${item.paid ?
        '<span class="badge badge-success">Pagado</span>' :
        '<span class="badge badge-warning">Pendiente</span>'
      }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            ${loan.payments.length > 0 ? `
              <h3 style="font-size: var(--font-size-lg); margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md);">Historial de Pagos</h3>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Principal</th>
                      <th>Interés</th>
                      <th>Mora</th>
                      <th>Recibo</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${loan.payments.map(payment => `
                      <tr>
                        <td>${new Date(payment.payment_date).toLocaleDateString('es-ES')}</td>
                        <td>$${payment.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>$${payment.principal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>$${payment.interest.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>$${payment.late_fee.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <button class="btn btn-sm btn-primary" onclick="paymentsAPI.getReceipt(${payment.id})">
                            Ver Recibo
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeLoanDetailModal()">Cerrar</button>
          </div>
        </div>
      </div >
      `;

    modal.style.display = 'block';
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function closeLoanDetailModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('loanDetailModal').style.display = 'none';
  }
}

function initLoans() {
  // Inicialización si es necesaria
}
