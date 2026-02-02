// Vista de Pagos y Cobranzas

let activeLoansForPayment = [];
let overdueLoans = [];

async function renderPayments(filters = {}) {
  try {
    const searchParams = new URLSearchParams(filters);
    const [payments, overdue, loans] = await Promise.all([
      paymentsAPI.getAll(filters),
      paymentsAPI.getOverdue(),
      loansAPI.getAll({ status: 'active' })
    ]);

    activeLoansForPayment = loans;
    overdueLoans = overdue;

    return `
      <div class="container">
        <div class="flex-between mb-4">
          <h1 style="font-size: var(--font-size-3xl); font-weight: 700;">Pagos y Cobranzas</h1>
          <button class="btn btn-primary" onclick="showPaymentModal()">+ Registrar Pago</button>
        </div>

        <div class="card mb-4">
            <div class="card-body">
                <div class="form-group" style="margin-bottom: 0;">
                    <input type="text" id="paymentSearch" class="form-input" placeholder="🔍 Buscar pago por nombre de cliente..." onkeyup="handlePaymentSearch(event)" value="${filters.search || ''}">
                </div>
            </div>
        </div>

        ${overdueLoans.length > 0 ? `
          <div class="card mb-4" style="border: 2px solid var(--danger);">
            <div class="card-header">
              <h2 class="card-title" style="color: var(--danger);">⚠️ Clientes en Mora (${overdueLoans.length})</h2>
            </div>
            <div class="card-body">
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Teléfono</th>
                      <th>Préstamo</th>
                      <th>Próximo Pago</th>
                      <th>Días de Atraso</th>
                      <th>Pagos Realizados</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${overdueLoans.map(loan => `
                      <tr>
                        <td><strong>${loan.client_name}</strong></td>
                        <td>${loan.phone || 'N/A'}</td>
                        <td>${loan.credit_type_name}</td>
                        <td>${new Date(loan.next_payment_date).toLocaleDateString('es-ES')}</td>
                        <td>
                          <span class="badge badge-danger">${loan.days_late} días</span>
                        </td>
                        <td>${loan.payments_made}</td>
                        <td>
                          <button class="btn btn-sm btn-secondary" onclick="registerPaymentForLoan(${loan.loan_id})">
                            Registrar Pago
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Historial de Pagos</h2>
          </div>
          <div class="card-body">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Recibo</th>
                    <th>Cliente</th>
                    <th>Préstamo</th>
                    <th>Fecha Pago</th>
                    <th>Monto</th>
                    <th>Principal</th>
                    <th>Interés</th>
                    <th>Mora</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map(payment => `
                    <tr>
                      <td>#${payment.receipt_number}</td>
                      <td>${payment.client_name}</td>
                      <td>${payment.credit_type_name}</td>
                      <td>${new Date(payment.payment_date).toLocaleDateString('es-ES')}</td>
                      <td><strong>$${payment.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></td>
                      <td>$${payment.principal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>$${payment.interest.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>${payment.late_fee > 0 ?
        `<span style="color: var(--danger);">$${payment.late_fee.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>` :
        '$0.00'
      }</td>
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
          </div>
        </div>
      </div>
      
      <div id="paymentModal" style="display: none;"></div>
    `;
  } catch (error) {
    console.error('Error cargando pagos:', error);
    return `
      <div class="container">
        <div class="container">
          <p style="color: var(--danger);">Error cargando pagos</p>
        </div>
      </div>
    `;
  }
}

function showPaymentModal(loanId = null) {
  const modal = document.getElementById('paymentModal');

  modal.innerHTML = `
    <div class="modal-overlay" onclick="closePaymentModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Registrar Pago</h2>
          <button class="btn btn-sm" onclick="closePaymentModal()">✕</button>
        </div>
        <div class="modal-body">
          <form id="paymentForm">
            <div class="form-group">
              <label class="form-label">Préstamo *</label>
              <select id="loan_id" class="form-select" required onchange="loadLoanInfo()">
                <option value="">Seleccione un préstamo</option>
                ${activeLoansForPayment.map(loan => `
                  <option value="${loan.id}" ${loanId === loan.id ? 'selected' : ''}>
                    ${loan.client_name} - ${loan.credit_type_name} - $${loan.amount.toLocaleString('es-ES')}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div id="loanInfo" style="display: none; background: var(--bg-tertiary); padding: var(--spacing-md); border-radius: var(--border-radius-sm); margin-bottom: var(--spacing-lg);">
              <p><strong>Información del Préstamo:</strong></p>
              <p id="loanInfoText"></p>
            </div>

            <div class="form-group">
              <label class="form-label">Monto del Pago *</label>
              <input type="number" step="0.01" id="amount" class="form-input" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Fecha de Pago *</label>
              <input type="date" id="payment_date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Fecha de Vencimiento *</label>
              <input type="date" id="due_date" class="form-input" required />
              <small style="color: var(--text-muted);">Fecha en que debía realizarse este pago</small>
            </div>
            
            <div class="form-group">
              <label class="form-label">Aplicar Pago a *</label>
              <select id="application_type" class="form-select" required>
                <option value="both">Capital e Intereses (Automático)</option>
                <option value="principal">Solo Capital</option>
                <option value="interest">Solo Intereses</option>
              </select>
              <small style="color: var(--text-muted); display: block; margin-top: 8px;">
                <strong>Automático:</strong> Aplica primero a mora, luego intereses, y finalmente capital<br>
                <strong>Solo Capital:</strong> Todo el pago se aplica al capital (excepto mora)<br>
                <strong>Solo Intereses:</strong> Todo el pago se aplica a intereses (excepto mora)
              </small>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closePaymentModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="savePayment()">Registrar Pago</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'block';

  if (loanId) {
    loadLoanInfo();
  }
}

async function loadLoanInfo() {
  const loanId = document.getElementById('loan_id').value;
  if (!loanId) {
    document.getElementById('loanInfo').style.display = 'none';
    return;
  }

  try {
    const [loan, schedule] = await Promise.all([
      loansAPI.getById(loanId),
      loansAPI.getSchedule(loanId)
    ]);

    const nextPayment = schedule.find(s => !s.paid);

    if (nextPayment) {
      document.getElementById('due_date').value = nextPayment.due_date;
      document.getElementById('amount').value = nextPayment.payment_amount;

      document.getElementById('loanInfoText').innerHTML = `
        Balance: $${loan.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<br>
        Próxima cuota: $${nextPayment.payment_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<br>
        Vencimiento: ${new Date(nextPayment.due_date).toLocaleDateString('es-ES')}
      `;
      document.getElementById('loanInfo').style.display = 'block';
    }
  } catch (error) {
    console.error('Error cargando info del préstamo:', error);
  }
}

function registerPaymentForLoan(loanId) {
  showPaymentModal(loanId);
}

function closePaymentModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('paymentModal').style.display = 'none';
  }
}

async function savePayment() {
  const loanId = parseInt(document.getElementById('loan_id').value);
  const amount = parseFloat(document.getElementById('amount').value);

  // Encontrar el préstamo para obtener datos del cliente (teléfono, nombre)
  const selectedLoan = activeLoansForPayment.find(l => l.id === loanId);

  const data = {
    loan_id: loanId,
    amount: amount,
    payment_date: document.getElementById('payment_date').value,
    due_date: document.getElementById('due_date').value,
    application_type: document.getElementById('application_type').value
  };

  try {
    const response = await paymentsAPI.create(data);

    if (!response || !response.id) {
      throw new Error('El servidor no devolvió el ID del pago registrado.');
    }

    // Cerrar modal de registro
    closePaymentModal();

    // Mostrar modal de éxito
    const modal = document.getElementById('paymentModal');
    modal.innerHTML = `
      <div class="modal-overlay" onclick="window.location.reload()">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title" style="color: var(--success);">¡Pago Registrado Exitosamente!</h2>
          </div>
          <div class="modal-body text-center">
             <div style="font-size: 50px; margin-bottom: 20px;">✅</div>
             <p style="font-size: 18px; margin-bottom: 20px;">
               Se ha registrado el pago de <strong>$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
             </p>
             <p class="mb-4">¿Qué deseas hacer ahora?</p>

             <div class="grid grid-2">
                <button class="btn btn-primary" onclick="paymentsAPI.getReceipt(${response.id})">
                  🖨️ Imprimir Recibo
                </button>
                <button class="btn" style="background-color: #25D366; color: white;" onclick="sendWhatsAppNotification('${selectedLoan?.client_name}', '${selectedLoan?.phone}', ${amount}, ${response.receipt_number || 'N/A'})">
                  📱 Enviar WhatsApp
                </button>
             </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="window.location.reload()">Terminar y Salir</button>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'block';

  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function sendWhatsAppNotification(clientName, phone, amount, receiptNumber) {
  if (!phone || phone === 'null' || phone === 'undefined' || phone.length < 5) {
    alert('El cliente no tiene un número de teléfono válido registrado.');
    return;
  }

  // Limpiar número de teléfono (quitar espacios, guiones, etc)
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  const message = `👋 Hola ${clientName}, confirmamos que hemos recibido tu pago de 💰 $${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}. 🧾 Recibo N° ${receiptNumber}. ¡Gracias por tu pago!`;

  const width = 1024;
  const height = 768;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;

  window.open(
    `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
    'WhatsApp',
    `width=${width},height=${height},top=${top},left=${left}`
  );
}

function initPayments() {
  // Inicialización si es necesaria
}

let searchTimeout;
function handlePaymentSearch(event) {
  const query = event.target.value;

  // Si presiona Enter
  if (event.key === 'Enter') {
    clearTimeout(searchTimeout);
    renderPayments({ search: query }).then(html => {
      document.getElementById('main-content').innerHTML = html;
      // Restaurar el foco y el cursor
      const input = document.getElementById('paymentSearch');
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    return;
  }

  // Debounce para búsqueda automática al escribir
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderPayments({ search: query }).then(html => {
      document.getElementById('main-content').innerHTML = html;
      // Restaurar el foco y el cursor
      const input = document.getElementById('paymentSearch');
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }, 500);
}
