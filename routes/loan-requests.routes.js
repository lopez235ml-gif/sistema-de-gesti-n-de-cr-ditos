const express = require('express');
const { query, get, run, getDb, saveDatabase } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todas las solicitudes
router.get('/', (req, res) => {
    try {
        const { status } = req.query;

        let sql = `
      SELECT lr.*, 
             c.full_name as client_name,
             ct.name as credit_type_name,
             u.username as reviewed_by_name
      FROM loan_requests lr
      JOIN clients c ON lr.client_id = c.id
      JOIN credit_types ct ON lr.credit_type_id = ct.id
      LEFT JOIN users u ON lr.reviewed_by = u.id
    `;

        if (status) {
            sql += ` WHERE lr.status = ?`;
            const requests = query(sql + ' ORDER BY lr.created_at DESC', [status]);
            return res.json(requests);
        }

        const requests = query(sql + ' ORDER BY lr.created_at DESC');
        res.json(requests);
    } catch (error) {
        console.error('Error obteniendo solicitudes:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener una solicitud específica
router.get('/:id', (req, res) => {
    try {
        const request = get(`
      SELECT lr.*, 
             c.full_name as client_name, c.id_number, c.phone, c.email,
             ct.name as credit_type_name, ct.interest_rate, ct.max_term_months,
             u.username as reviewed_by_name
      FROM loan_requests lr
      JOIN clients c ON lr.client_id = c.id
      JOIN credit_types ct ON lr.credit_type_id = ct.id
      LEFT JOIN users u ON lr.reviewed_by = u.id
      WHERE lr.id = ?
    `, [req.params.id]);

        if (!request) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        res.json(request);
    } catch (error) {
        console.error('Error obteniendo solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Crear nueva solicitud
router.post('/', (req, res) => {
    try {
        const { client_id, credit_type_id, requested_amount, requested_term, notes } = req.body;

        if (!client_id || !credit_type_id || !requested_amount || !requested_term) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Verificar que el cliente existe
        const client = get('SELECT id FROM clients WHERE id = ?', [client_id]);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Verificar que el tipo de crédito existe y está activo
        const creditType = get('SELECT * FROM credit_types WHERE id = ? AND active = 1', [credit_type_id]);
        if (!creditType) {
            return res.status(404).json({ error: 'Tipo de crédito no encontrado o inactivo' });
        }

        // Verificar que el plazo no exceda el máximo
        if (requested_term > creditType.max_term_months) {
            return res.status(400).json({
                error: `El plazo solicitado excede el máximo permitido (${creditType.max_term_months} meses)`
            });
        }

        const result = run(`
      INSERT INTO loan_requests (client_id, credit_type_id, requested_amount, requested_term, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [client_id, credit_type_id, requested_amount, requested_term, notes || null]);

        const newRequest = get(`
      SELECT lr.*, c.full_name as client_name, ct.name as credit_type_name
      FROM loan_requests lr
      JOIN clients c ON lr.client_id = c.id
      JOIN credit_types ct ON lr.credit_type_id = ct.id
      WHERE lr.id = ?
    `, [result.lastInsertRowid]);

        res.status(201).json(newRequest);
    } catch (error) {
        console.error('Error creando solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Aprobar solicitud
router.put('/:id/approve', (req, res) => {
    try {
        const request = get('SELECT * FROM loan_requests WHERE id = ?', [req.params.id]);

        if (!request) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ error: 'Solo se pueden aprobar solicitudes pendientes' });
        }

        const { first_payment_date } = req.body;
        if (!first_payment_date) {
            return res.status(400).json({ error: 'Fecha del primer pago es requerida' });
        }

        // Obtener el tipo de crédito
        const creditType = get('SELECT * FROM credit_types WHERE id = ?', [request.credit_type_id]);

        // Actualizar solicitud
        run(`
      UPDATE loan_requests 
      SET status = 'approved', reviewed_by = ?
      WHERE id = ?
    `, [req.user.id, req.params.id]);

        // Crear préstamo
        const loanResult = run(`
      INSERT INTO loans (client_id, credit_type_id, amount, interest_rate, term_months, 
                        approved_date, first_payment_date, approved_by)
      VALUES (?, ?, ?, ?, ?, DATE('now'), ?, ?)
    `, [
            request.client_id,
            request.credit_type_id,
            request.requested_amount,
            creditType.interest_rate,
            request.requested_term,
            first_payment_date,
            req.user.id
        ]);

        const newLoan = get(`
      SELECT l.*, c.full_name as client_name, ct.name as credit_type_name
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      JOIN credit_types ct ON l.credit_type_id = ct.id
      WHERE l.id = ?
    `, [loanResult.lastInsertRowid]);

        res.json({ message: 'Solicitud aprobada', loan: newLoan });
    } catch (error) {
        console.error('Error aprobando solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Rechazar solicitud
router.put('/:id/reject', (req, res) => {
    try {
        const request = get('SELECT * FROM loan_requests WHERE id = ?', [req.params.id]);

        if (!request) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ error: 'Solo se pueden rechazar solicitudes pendientes' });
        }

        const { notes } = req.body;

        run(`
      UPDATE loan_requests 
      SET status = 'rejected', reviewed_by = ?, notes = ?
      WHERE id = ?
    `, [req.user.id, notes || request.notes, req.params.id]);

        const updatedRequest = get('SELECT * FROM loan_requests WHERE id = ?', [req.params.id]);
        res.json({ message: 'Solicitud rechazada', request: updatedRequest });
    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
