const express = require('express');
const { query, get, run } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los clientes
router.get('/', (req, res) => {
    try {
        const clients = query('SELECT * FROM clients ORDER BY created_at DESC');
        res.json(clients);
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener un cliente específico con historial completo
router.get('/:id', (req, res) => {
    try {
        const client = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);

        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Obtener historial de préstamos
        const loans = query(`
            SELECT l.*, ct.name as credit_type_name 
            FROM loans l
            JOIN credit_types ct ON l.credit_type_id = ct.id
            WHERE l.client_id = ?
            ORDER BY l.created_at DESC
        `, [req.params.id]);

        // Calcular estadísticas
        let totalDebt = 0;
        let activeLoansCount = 0;
        let onTimePayments = 0;
        let latePayments = 0;

        // Obtener todos los pagos del cliente para análisis de comportamiento
        const payments = query(`
            SELECT p.*, l.status as loan_status
            FROM payments p
            JOIN loans l ON p.loan_id = l.id
            WHERE l.client_id = ?
        `, [req.params.id]);

        // Analizar préstamos para deuda actual
        loans.forEach(loan => {
            if (loan.status === 'active' || loan.status === 'defaulted') {
                const loanPayments = payments.filter(p => p.loan_id === loan.id);
                const paidPrincipal = loanPayments.reduce((sum, p) => sum + p.principal, 0);
                const balance = loan.amount - paidPrincipal;

                // Asegurarse de que el balance no sea negativo (por si acaso)
                totalDebt += Math.max(0, balance);
                activeLoansCount++;
            }
        });

        // Analizar comportamiento de pago
        payments.forEach(payment => {
            if (payment.late_fee > 0) {
                latePayments++;
            } else {
                onTimePayments++;
            }
        });

        // Calcular Score (0-100)
        const totalPayments = onTimePayments + latePayments;
        const score = totalPayments > 0
            ? Math.round((onTimePayments / totalPayments) * 100)
            : 100; // Base 100 si no tiene historial

        res.json({
            ...client,
            loans,
            stats: {
                totalDebt,
                activeLoansCount,
                totalLoansCount: loans.length,
                onTimePayments,
                latePayments,
                score,
                rating: score >= 90 ? 'Excelente' : score >= 70 ? 'Bueno' : score >= 50 ? 'Regular' : 'Malo'
            }
        });
    } catch (error) {
        console.error('Error obteniendo cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Crear nuevo cliente
router.post('/', (req, res) => {
    try {
        const { full_name, id_number, phone, email, address } = req.body;

        if (!full_name || !id_number) {
            return res.status(400).json({ error: 'Nombre e identificación son requeridos' });
        }

        // Verificar si ya existe un cliente con ese número de identificación
        const existing = get('SELECT id FROM clients WHERE id_number = ?', [id_number]);
        if (existing) {
            return res.status(400).json({ error: 'Ya existe un cliente con ese número de identificación' });
        }

        const result = run(`
      INSERT INTO clients (full_name, id_number, phone, email, address)
      VALUES (?, ?, ?, ?, ?)
    `, [full_name, id_number, phone || null, email || null, address || null]);

        const newClient = get('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(newClient);
    } catch (error) {
        console.error('Error creando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Actualizar cliente
router.put('/:id', (req, res) => {
    try {
        const { full_name, id_number, phone, email, address, status } = req.body;

        const client = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        run(`
      UPDATE clients 
      SET full_name = ?, id_number = ?, phone = ?, email = ?, address = ?, status = ?
      WHERE id = ?
    `, [
            full_name || client.full_name,
            id_number || client.id_number,
            phone || client.phone,
            email || client.email,
            address || client.address,
            status || client.status,
            req.params.id
        ]);

        const updatedClient = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        res.json(updatedClient);
    } catch (error) {
        console.error('Error actualizando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Eliminar cliente
router.delete('/:id', (req, res) => {
    try {
        // Verificar si el cliente tiene préstamos activos
        const activeLoans = get('SELECT COUNT(*) as count FROM loans WHERE client_id = ? AND status = ?',
            [req.params.id, 'active']);

        if (activeLoans && activeLoans.count > 0) {
            return res.status(400).json({ error: 'No se puede eliminar un cliente con préstamos activos' });
        }

        run('DELETE FROM clients WHERE id = ?', [req.params.id]);
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando cliente:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
