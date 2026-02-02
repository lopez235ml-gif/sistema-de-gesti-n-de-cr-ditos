/**
 * Genera un recibo de pago en formato HTML
 * @param {Object} payment - Información del pago
 * @param {Object} loan - Información del préstamo
 * @param {Object} client - Información del cliente
 * @returns {string} HTML del recibo
 */
function generateReceipt(payment, loan, client) {
  const receiptDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo de Pago #${payment.receipt_number}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background: #f5f5f5;
      }
      .receipt {
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        border-bottom: 3px solid #2563eb;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .header h1 {
        margin: 0;
        color: #1e40af;
        font-size: 28px;
      }
      .receipt-number {
        color: #64748b;
        font-size: 14px;
        margin-top: 5px;
      }
      .section {
        margin-bottom: 25px;
      }
      .section-title {
        font-weight: bold;
        color: #1e40af;
        margin-bottom: 10px;
        font-size: 16px;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e2e8f0;
      }
      .info-label {
        color: #64748b;
        font-weight: 500;
      }
      .info-value {
        color: #1e293b;
        font-weight: 600;
      }
      .total-section {
        background: #f1f5f9;
        padding: 20px;
        border-radius: 6px;
        margin-top: 30px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        font-size: 18px;
      }
      .total-label {
        font-weight: bold;
        color: #1e40af;
      }
      .total-value {
        font-weight: bold;
        color: #059669;
        font-size: 24px;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px solid #e2e8f0;
        text-align: center;
        color: #64748b;
        font-size: 12px;
      }
      
      /* Print Styles */
      @media print {
        body {
          background: white;
          margin: 0;
          padding: 0;
        }
        .receipt {
          box-shadow: none;
          border: none;
          padding: 0;
        }
        .no-print {
          display: none !important;
        }
      }
      
      .btn-print {
        display: block;
        margin: 0 auto 20px;
        background: #2563eb;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .btn-print:hover {
        background: #1d4ed8;
      }
    </style>
  </head>
  <body>
    <button onclick="window.print()" class="btn-print no-print">
      🖨️ Imprimir Recibo
    </button>
    
    <div class="receipt">
      <div class="header">
        <h1>RECIBO DE PAGO</h1>
        <div class="receipt-number">Recibo #${payment.receipt_number}</div>
        <div class="receipt-number">${receiptDate}</div>
      </div>

      <div class="section">
        <div class="section-title">Información del Cliente</div>
        <div class="info-row">
          <span class="info-label">Nombre:</span>
          <span class="info-value">${client.full_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Identificación:</span>
          <span class="info-value">${client.id_number}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Teléfono:</span>
          <span class="info-value">${client.phone || 'N/A'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Información del Préstamo</div>
        <div class="info-row">
          <span class="info-label">Número de Préstamo:</span>
          <span class="info-value">#${loan.id}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Monto Original:</span>
          <span class="info-value">$${loan.amount.toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tasa de Interés:</span>
          <span class="info-value">${loan.interest_rate}%</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Detalle del Pago</div>
        <div class="info-row">
          <span class="info-label">Fecha de Pago:</span>
          <span class="info-value">${new Date(payment.payment_date).toLocaleDateString('es-ES')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha de Vencimiento:</span>
          <span class="info-value">${new Date(payment.due_date).toLocaleDateString('es-ES')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Principal:</span>
          <span class="info-value">$${payment.principal.toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Interés:</span>
          <span class="info-value">$${payment.interest.toFixed(2)}</span>
        </div>
        ${payment.late_fee > 0 ? `
        <div class="info-row">
          <span class="info-label">Mora:</span>
          <span class="info-value" style="color: #dc2626;">$${payment.late_fee.toFixed(2)}</span>
        </div>
        ` : ''}
      </div>

      <div class="total-section">
        <div class="total-row">
          <span class="total-label">TOTAL PAGADO:</span>
          <span class="total-value">$${payment.amount.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Este es un documento generado automáticamente.</p>
        <p>Gracias por su pago puntual.</p>
      </div>
    </div>
    
    <script>
      // Auto-imprimir al cargar
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 500);
      };
    </script>
  </body>
  </html>
`;

  return html;
}

/**
 * Genera el siguiente número de recibo
 * @param {Object} dbFunctions - Funciones de base de datos {query, get, run}
 * @returns {number} Número de recibo
 */
function generateReceiptNumber(dbFunctions) {
  const result = dbFunctions.get('SELECT MAX(receipt_number) as max_number FROM payments', []);
  return (result?.max_number || 0) + 1;
}

module.exports = {
  generateReceipt,
  generateReceiptNumber
};
