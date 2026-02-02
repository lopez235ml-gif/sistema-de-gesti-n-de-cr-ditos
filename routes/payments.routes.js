const express = require('express');
const { query, get, run } = require('../database');
const { authenticateToken } = require('../auth');
const { calculateDaysLate, calculateLateFee, distributePayment } = require('../utils/calculations');
const { generateReceipt, generateReceiptNumber } = require('../utils/receipt-generator');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los pagos
router.get('/', (req, res) => {
    try {
        const { loan_id, status } = req.query;

        let sql = `
      SELECT p.*, 
             l.id as loan_id,
             c.full_name as client_name,
             ct.name as credit_type_name
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      JOIN credit_types ct ON l.credit_type_id = ct.id
    `;

        const conditions = [];
        const params = [];

        if (loan_id) {
            conditions.push('p.loan_id = ?');
            params.push(loan_id);
        }

        if (status) {
            conditions.push('p.status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY p.payment_date DESC';

        const payments = query(sql, params);
        res.json(payments);
    } catch (error) {
        console.error('Error obteniendo pagos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener pagos en mora
router.get('/overdue', (req, res) => {
    try {
        const overdueLoans = query(`
      SELECT DISTINCT
             l.id as loan_id,
             l.amount as loan_amount,
             l.first_payment_date,
             c.id as client_id,
             c.full_name as client_name,
             c.phone,
             ct.name as credit_type_name,
             ct.late_fee_rate,
             ct.grace_days
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      JOIN credit_types ct ON l.credit_type_id = ct.id
      WHERE l.status = 'active'
    `);

        const overdueDetails = [];

        for (const loan of overdueLoans) {
            // Obtener pagos realizados
            const payments = query('SELECT * FROM payments WHERE loan_id = ?', [loan.loan_id]);

            // Calcular cuántos pagos se han hecho
            const paymentsMade = payments.length;

            // Calcular fecha de vencimiento del siguiente pago
            const nextPaymentDate = new Date(loan.first_payment_date);
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + paymentsMade);

            // Calcular días de retraso
            const daysLate = calculateDaysLate(nextPaymentDate.toISOString().split('T')[0]);

            if (daysLate > loan.grace_days) {
                overdueDetails.push({
                    ...loan,
                    next_payment_date: nextPaymentDate.toISOString().split('T')[0],
                    days_late: daysLate,
                    effective_days_late: daysLate - loan.grace_days,
                    payments_made: paymentsMade
                });
            }
        }

        // Ordenar por días de retraso (mayor a menor)
        overdueDetails.sort((a, b) => b.days_late - a.days_late);

        res.json(overdueDetails);
    } catch (error) {
        console.error('Error obteniendo pagos en mora:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Registrar un pago
router.post('/', (req, res) => {
    try {
        const { loan_id, amount, payment_date, due_date, application_type } = req.body;

        if (!loan_id || !amount || !payment_date || !due_date) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Validar tipo de aplicación
        const validTypes = ['both', 'principal', 'interest'];
        const applicationType = application_type || 'both';

        if (!validTypes.includes(applicationType)) {
            return res.status(400).json({ error: 'Tipo de aplicación inválido' });
        }

        // Obtener información del préstamo
        const loan = get(`
      SELECT l.*, ct.late_fee_rate, ct.grace_days, ct.frequency
      FROM loans l
      JOIN credit_types ct ON l.credit_type_id = ct.id
      WHERE l.id = ?
    `, [loan_id]);

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        if (loan.status !== 'active') {
            return res.status(400).json({ error: 'El préstamo no está activo' });
        }

        // Calcular días de retraso y mora
        const daysLate = calculateDaysLate(due_date, payment_date);
        const lateFee = calculateLateFee(amount, loan.late_fee_rate, daysLate, loan.grace_days);

        // Calcular interés usando interés simple sobre el periodo
        // Interés total = monto × tasa / 100
        const totalInterest = (loan.amount * loan.interest_rate) / 100;

        // Interés por cuota = interés total / número de cuotas
        const interestPerPayment = totalInterest / loan.term_months;

        // Interés que corresponde a este pago
        const interestDue = Math.round(interestPerPayment * 100) / 100;

        let distribution;

        // Aplicar el pago según el tipo seleccionado
        if (applicationType === 'principal') {
            // Solo aplicar a capital
            distribution = {
                principal: amount - lateFee,
                interest: 0,
                late_fee: lateFee
            };
        } else if (applicationType === 'interest') {
            // Solo aplicar a intereses
            distribution = {
                principal: 0,
                interest: amount - lateFee,
                late_fee: lateFee
            };
        } else {
            // Aplicar a ambos (comportamiento por defecto: mora → interés → capital)
            distribution = distributePayment(amount, interestDue, lateFee);
        }

        // Generar número de recibo
        const receiptNumber = generateReceiptNumber({ query, get, run });

        // Registrar el pago
        const result = run(`
      INSERT INTO payments (loan_id, amount, principal, interest, late_fee, payment_date, due_date, receipt_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            loan_id,
            amount,
            distribution.principal,
            distribution.interest,
            distribution.late_fee,
            payment_date,
            due_date,
            receiptNumber
        ]);

        // Verificar si el préstamo está completamente pagado
        const totalPaidResult = get('SELECT SUM(principal) as total FROM payments WHERE loan_id = ?', [loan_id]);
        if (totalPaidResult && totalPaidResult.total >= loan.amount) {
            run('UPDATE loans SET status = ? WHERE id = ?', ['paid', loan_id]);
        }

        const newPayment = get('SELECT * FROM payments WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(newPayment);
    } catch (error) {
        console.error('Error registrando pago:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Generar recibo de pago
router.get('/:id/receipt', (req, res) => {
    try {
        const payment = get('SELECT * FROM payments WHERE id = ?', [req.params.id]);

        if (!payment) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        const loan = get('SELECT * FROM loans WHERE id = ?', [payment.loan_id]);
        const client = get('SELECT * FROM clients WHERE id = ?', [loan.client_id]);

        const receiptHTML = generateReceipt(payment, loan, client);

        res.setHeader('Content-Type', 'text/html');
        res.send(receiptHTML);
    } catch (error) {
        console.error('Error generando recibo:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
