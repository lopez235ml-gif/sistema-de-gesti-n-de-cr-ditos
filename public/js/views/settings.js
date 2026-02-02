// Vista de Configuración del Sistema

async function renderSettings() {
  try {
    const settings = await settingsAPI.getAll();

    // Convertir array de objetos a objeto simple para facilitar acceso
    // Si la API ya devuelve un objeto { key: value }, esto no es necesario,
    // pero aseguramos compatibilidad
    let config = settings;
    if (Array.isArray(settings)) {
      config = {};
      settings.forEach(s => config[s.key] = s.value);
    }

    return `
      <div class="container">
          <h1 class="mb-4" style="font-size: var(--font-size-3xl); font-weight: 700;">Configuración del Sistema</h1>

          <div class="grid grid-2">
            <!-- Información General -->
            <div class="card">
              <div class="card-body">
                <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md); border-bottom: 2px solid var(--primary-color); padding-bottom: 10px;">
                  Información de la Empresa
                </h3>
                
                <div class="form-group">
                  <label class="form-label">Nombre de la Empresa</label>
                  <input type="text" id="company_name" class="form-input" value="${config.company_name || ''}">
                  <small style="color: var(--text-muted);">Aparecerá en el encabezado y reportes</small>
                </div>

                <div class="form-group">
                  <label class="form-label">Logo URL</label>
                  <input type="text" id="logo_url" class="form-input" value="${config.logo_url || ''}">
                  <small style="color: var(--text-muted);">Enlace a la imagen del logo</small>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Identificación Fiscal (RUC/NIT)</label>
                  <input type="text" id="tax_id" class="form-input" value="${config.tax_id || ''}">
                </div>
              </div>
            </div>

            <!-- Finanzas y Moneda -->
            <div class="card">
              <div class="card-body">
                <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md); border-bottom: 2px solid var(--primary-color); padding-bottom: 10px;">
                  Símbolo y Moneda
                </h3>

                <div class="form-group">
                  <label class="form-label">Símbolo de Moneda</label>
                  <input type="text" id="currency_symbol" class="form-input" value="${config.currency_symbol || '$'}">
                  <small style="color: var(--text-muted);">Ej: $, C$, €, £</small>
                </div>
              </div>
            </div>

            <!-- Contacto y Dirección -->
            <div class="card" style="grid-column: 1 / -1;">
              <div class="card-body">
                <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md); border-bottom: 2px solid var(--primary-color); padding-bottom: 10px;">
                  Datos de Contacto (Para Recibos)
                </h3>

                <div class="grid grid-2">
                  <div class="form-group">
                    <label class="form-label">Dirección</label>
                    <textarea id="address" class="form-textarea" rows="3">${config.address || ''}</textarea>
                  </div>
                  <div>
                    <div class="form-group">
                      <label class="form-label">Teléfono</label>
                      <input type="text" id="phone" class="form-input" value="${config.phone || ''}">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Email</label>
                      <input type="text" id="email" class="form-input" value="${config.email || ''}">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Seguridad y Mantenimiento -->
            <div class="card" style="grid-column: 1 / -1; border: 1px solid var(--secondary);">
              <div class="card-body">
                <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-md); border-bottom: 2px solid var(--secondary); padding-bottom: 10px;">
                  🛡️ Seguridad y Mantenimiento
                </h3>
                
                <p class="mb-4">
                  Descarga una copia completa de tu base de datos. Guarda este archivo en un lugar seguro (USB, nube) para evitar pérdida de información.
                </p>

                <button class="btn btn-outline" onclick="downloadBackup()">
                  📦 Descargar Copia de Seguridad
                </button>
              </div>
            </div>
          </div>

          <div class="mt-4 text-right">
            <button class="btn btn-primary" onclick="saveSettings()">
              Guardar Configuración
            </button>
          </div>
        </div>
      
    `;
  } catch (error) {
    console.error('Error cargando configuración:', error);
    return `
      <div class="container">
        <div class="container">
          <p style="color: var(--danger);">Error cargando configuración del sistema</p>
        </div>
      </div>
    `;
  }
}

async function saveSettings() {
  const settings = {
    company_name: document.getElementById('company_name').value,
    logo_url: document.getElementById('logo_url').value,
    tax_id: document.getElementById('tax_id').value,
    currency_symbol: document.getElementById('currency_symbol').value,
    address: document.getElementById('address').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value
  };

  try {
    await settingsAPI.update(settings);
    alert('Configuración guardada correctamente. Por favor recarga la página para ver algunos cambios.');
    window.location.reload();
  } catch (error) {
    alert('Error guardando configuración: ' + error.message);
  }
}

async function downloadBackup() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No estás autenticado');
      return;
    }

    const response = await fetch('/api/settings/backup', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Error descargando backup');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-gravity-${new Date().toISOString().split('T')[0]}.db`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (error) {
    console.error('Error:', error);
    alert('Error descargando la copia de seguridad');
  }
}

function initSettings() {
  // Inicialización si es necesaria
}
