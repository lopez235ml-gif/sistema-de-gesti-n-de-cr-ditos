// Vista de Control de Gastos

async function renderExpenses() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  try {
    const expenses = await expensesAPI.getAll({ startDate: firstDay, endDate: lastDay });

    // Calcular total del mes
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return `
      <div class="container">
          <div class="flex-between mb-4">
            <h1 style="font-size: var(--font-size-3xl); font-weight: 700;">Control de Gastos (Caja Chica)</h1>
            <button class="btn btn-primary" onclick="showExpenseModal()">+ Registrar Gasto</button>
          </div>

          <div class="grid grid-2 mb-4">
            <div class="card">
              <div class="card-body">
                <h3 class="card-title">Gastos del Mes</h3>
                <p class="card-value" style="color: var(--danger);">-$${totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                <small style="color: var(--text-muted);">Periodo: ${firstDay} al ${lastDay}</small>
              </div>
            </div>
            <!-- Aquí podríamos poner Utilidad más adelante -->
          </div>

          <div class="card">
            <div class="card-header flex-between">
               <h2 class="card-title">Detalle de Gastos</h2>
               <div>
                  <!-- Filtros simples (opcional para v2) -->
               </div>
            </div>
            <div class="card-body">
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Categoría</th>
                      <th>Monto</th>
                      <th>Notas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${expenses.length > 0 ? expenses.map(expense => `
                      <tr>
                        <td>${new Date(expense.expense_date).toLocaleDateString('es-ES')}</td>
                        <td>${expense.description}</td>
                        <td><span class="badge badge-secondary">${expense.category || 'General'}</span></td>
                        <td style="color: var(--danger); font-weight: bold;">-$${expense.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                        <td>${expense.notes || '-'}</td>
                        <td>
                          <button class="btn btn-sm btn-outline btn-danger" onclick="deleteExpense(${expense.id})">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    `).join('') : `
                      <tr>
                        <td colspan="6" class="text-center">No hay gastos registrados este mes</td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      
      <div id="expenseModal" style="display: none;"></div>
    `;
  } catch (error) {
    console.error('Error cargando gastos:', error);
    return `
      <div class="container">
        <div class="container">
          <p style="color: var(--danger);">Error cargando gastos</p>
        </div>
      </div>
    `;
  }
}

function showExpenseModal() {
  const modal = document.getElementById('expenseModal');
  const today = new Date().toISOString().split('T')[0];

  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeExpenseModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Registrar Nuevo Gasto</h2>
          <button class="btn btn-sm" onclick="closeExpenseModal()">✕</button>
        </div>
        <div class="modal-body">
          <form id="expenseForm">
            <div class="form-group">
              <label class="form-label">Descripción *</label>
              <input type="text" id="desc" class="form-input" placeholder="Ej: Pago de Luz" required />
            </div>

            <div class="form-group">
              <label class="form-label">Monto *</label>
              <input type="number" step="0.01" id="amount" class="form-input" placeholder="0.00" required />
            </div>

            <div class="grid grid-2">
                <div class="form-group">
                  <label class="form-label">Categoría</label>
                  <select id="category" class="form-select">
                    <option value="Alquiler">Alquiler</option>
                    <option value="Servicios">Servicios (Luz/Agua/Internet)</option>
                    <option value="Sueldos">Sueldos</option>
                    <option value="Suministros">Suministros / Papelería</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Impuestos">Impuestos</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Fecha *</label>
                  <input type="date" id="date" class="form-input" value="${today}" required />
                </div>
            </div>

            <div class="form-group">
              <label class="form-label">Notas Adicionales</label>
              <textarea id="notes" class="form-textarea" rows="2"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeExpenseModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveExpense()">Guardar Gasto</button>
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'block';
}

function closeExpenseModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('expenseModal').style.display = 'none';
  }
}

async function saveExpense() {
  const description = document.getElementById('desc').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const expense_date = document.getElementById('date').value;
  const notes = document.getElementById('notes').value;

  if (!description || !amount || !expense_date) {
    alert('Por favor complete todos los campos obligatorios');
    return;
  }

  try {
    await expensesAPI.create({
      description,
      amount,
      category,
      expense_date,
      notes
    });
    closeExpenseModal();
    window.location.reload();
  } catch (error) {
    alert('Error guardando gasto: ' + error.message);
  }
}

async function deleteExpense(id) {
  if (confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
    try {
      await expensesAPI.delete(id);
      window.location.reload();
    } catch (error) {
      alert('Error eliminando gasto: ' + error.message);
    }
  }
}

function initExpenses() {
  // Inicialización si es necesaria
}
