const express = require('express');
const router = express.Router();
const db = require('../database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gravity_secret_key_123';

// Login simple para clientes
router.post('/login', (req, res) => {
    try {
        const { id_number, phone_last4 } = req.body;

        if (!id_number || !phone_last4) {
            return res.status(400).json({ error: 'ID y últimos 4 dígitos del teléfono son requeridos' });
        }

        const client = db.get('SELECT * FROM clients WHERE id_number = ?', [id_number]);

        if (!client) {
            return res.status(401).json({ error: 'Cliente no encontrado' });
        }

        // Verificar últimos 4 dígitos del teléfono
        const phone = client.phone || '';
        const cleanPhone = phone.replace(/\D/g, ''); // Eliminar no numéricos

        if (cleanPhone.length < 4 || !cleanPhone.endsWith(phone_last4)) {
            // Permitir también si el usuario ingresó el teléfono completo por error y coincide
            if (cleanPhone !== phone_last4) {
                return res.status(401).json({ error: 'Verificación de teléfono fallida' });
            }
        }

        // Generar token específico para portal (dura menos, ej: 1 hora)
        const token = jwt.sign(
            { id: client.id, type: 'client', full_name: client.full_name },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token, client: { id: client.id, full_name: client.full_name } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener resumen del cliente
router.get('/summary', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== 'client') {
            return res.status(403).json({ error: 'Token inválido para portal de clientes' });
        }

        const clientId = decoded.id;

        // Obtener préstamos activos
        const loans = db.query(`
            SELECT 
                l.id, l.amount, l.term_months, l.status, l.created_at,
                ct.name as credit_type,
                (SELECT COUNT(*) FROM payments p WHERE p.loan_id = l.id) as payments_made,
                (SELECT SUM(amount) FROM payments p WHERE p.loan_id = l.id) as total_paid
            FROM loans l
            JOIN credit_types ct ON l.credit_type_id = ct.id
            WHERE l.client_id = ? AND l.status IN ('active', 'defaulted')
        `, [clientId]);

        // Calcular próxima fecha de pago y monto (estimado simple)
        // En un sistema real esto vendría de una tabla de cronograma
        let nextPayment = null;
        let totalDebt = 0;

        loans.forEach(loan => {
            // Calcular deuda aproximada (Capital + Interes) - Pagado
            // Esto es simplificado. Lo ideal es usar la lógica de calculations.js
            // Pero para el portal usaremos queries directos o lógica simple por ahora

            // Si hay préstamos activos, buscamos el próximo pago
            // Por simplicidad, tomamos la fecha del préstamo + 1 mes * pagos hechos + 1

            const loanTotalPaid = loan.total_paid || 0;
            // Total a pagar aprox (Simulado, deberíamos guardar el total a pagar en DB o calcularlo bien)
            // Asumimos interés simple mensual: Monto * (1 + Tasa * Meses)
            // Necesitamos tasa. La query de arriba no la trajo, la agregamos? Mejor traerla.
        });

        // Mejorada query para traer más detalles
        const detailedLoans = db.query(`
             SELECT l.*, ct.name as credit_type_name
             FROM loans l
             JOIN credit_types ct ON l.credit_type_id = ct.id
             WHERE l.client_id = ?
             ORDER BY l.created_at DESC
        `, [clientId]);

        const summary = {
            client: { id: decoded.id, full_name: decoded.full_name },
            active_loans: detailedLoans.filter(l => ['active', 'defaulted'].includes(l.status)),
            history: detailedLoans.filter(l => ['paid'].includes(l.status)),
        };

        res.json(summary);

    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Sesión expirada o inválida' });
    }
});

module.exports = router;
