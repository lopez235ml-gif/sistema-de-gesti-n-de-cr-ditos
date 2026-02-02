const express = require('express');
const { query, get, run } = require('../database');
const { authenticateToken } = require('../auth');
const { generateAmortizationSchedule } = require('../utils/calculations');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los préstamos
router.get('/', (req, res) => {
    try {
        const { status, client_id } = req.query;

        let sql = `
      SELECT l.*, 
             c.full_name as client_name, c.id_number, c.phone,
             ct.name as credit_type_name, ct.frequency,
             u.username as approved_by_name
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      JOIN credit_types ct ON l.credit_type_id = ct.id
      LEFT JOIN users u ON l.approved_by = u.id
    `;

        const conditions = [];
        const params = [];

        if (status) {
            conditions.push('l.status = ?');
            params.push(status);
        }

        if (client_id) {
            conditions.push('l.client_id = ?');
            params.push(client_id);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY l.created_at DESC';

        const loans = query(sql, params);
        res.json(loans);
    } catch (error) {
        console.error('Error obteniendo préstamos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener un préstamo específico
router.get('/:id', (req, res) => {
    try {
        const loan = get(`
      SELECT l.*, 
             c.full_name as client_name, c.id_number, c.phone, c.email, c.address,
             ct.name as credit_type_name, ct.frequency, ct.late_fee_rate, ct.grace_days,
             u.username as approved_by_name
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      JOIN credit_types ct ON l.credit_type_id = ct.id
      LEFT JOIN users u ON l.approved_by = u.id
      WHERE l.id = ?
    `, [req.params.id]);

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        // Obtener pagos realizados
        const payments = query(`
      SELECT * FROM payments 
      WHERE loan_id = ? 
      ORDER BY payment_date DESC
    `, [req.params.id]);

        // Calcular balance pendiente
        const totalPaid = payments.reduce((sum, p) => sum + p.principal, 0);
        const balance = loan.amount - totalPaid;

        res.json({ ...loan, payments, balance });
    } catch (error) {
        console.error('Error obteniendo préstamo:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener tabla de amortización
router.get('/:id/schedule', (req, res) => {
    try {
        const loan = get(`
      SELECT l.*, ct.frequency
      FROM loans l
      JOIN credit_types ct ON l.credit_type_id = ct.id
      WHERE l.id = ?
    `, [req.params.id]);

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        const schedule = generateAmortizationSchedule(
            loan.amount,
            loan.interest_rate,
            loan.term_months,
            new Date(loan.first_payment_date),
            loan.frequency
        );

        // Obtener pagos realizados
        const payments = query('SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date', [req.params.id]);

        // Marcar cuáles cuotas han sido pagadas
        const scheduleWithStatus = schedule.map((item, index) => {
            const payment = payments[index];
            return {
                ...item,
                paid: !!payment,
                payment_id: payment?.id,
                actual_payment_date: payment?.payment_date,
                actual_amount: payment?.amount
            };
        });

        res.json(scheduleWithStatus);
    } catch (error) {
        console.error('Error generando tabla de amortización:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Actualizar estado del préstamo
router.put('/:id', (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Estado es requerido' });
        }

        const validStatuses = ['active', 'paid', 'defaulted', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        run('UPDATE loans SET status = ? WHERE id = ?', [status, req.params.id]);

        const updatedLoan = get('SELECT * FROM loans WHERE id = ?', [req.params.id]);
        res.json(updatedLoan);
    } catch (error) {
        console.error('Error actualizando préstamo:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
