const express = require('express');
const { query, get, run } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los tipos de crédito
router.get('/', (req, res) => {
    try {
        const creditTypes = query('SELECT * FROM credit_types ORDER BY name');
        res.json(creditTypes);
    } catch (error) {
        console.error('Error obteniendo tipos de crédito:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener un tipo de crédito específico
router.get('/:id', (req, res) => {
    try {
        const creditType = get('SELECT * FROM credit_types WHERE id = ?', [req.params.id]);

        if (!creditType) {
            return res.status(404).json({ error: 'Tipo de crédito no encontrado' });
        }

        res.json(creditType);
    } catch (error) {
        console.error('Error obteniendo tipo de crédito:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Crear nuevo tipo de crédito
router.post('/', (req, res) => {
    try {
        const { name, interest_rate, interest_type, frequency, max_term_months, late_fee_rate, grace_days } = req.body;

        if (!name || !interest_rate || !max_term_months) {
            return res.status(400).json({ error: 'Nombre, tasa de interés y plazo máximo son requeridos' });
        }

        const result = run(`
      INSERT INTO credit_types (name, interest_rate, interest_type, frequency, max_term_months, late_fee_rate, grace_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            name,
            interest_rate,
            interest_type || 'simple',
            frequency || 'monthly',
            max_term_months,
            late_fee_rate || 0,
            grace_days || 0
        ]);

        const newCreditType = get('SELECT * FROM credit_types WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(newCreditType);
    } catch (error) {
        console.error('Error creando tipo de crédito:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Actualizar tipo de crédito
router.put('/:id', (req, res) => {
    try {
        const { name, interest_rate, interest_type, frequency, max_term_months, late_fee_rate, grace_days, active } = req.body;

        const creditType = get('SELECT * FROM credit_types WHERE id = ?', [req.params.id]);
        if (!creditType) {
            return res.status(404).json({ error: 'Tipo de crédito no encontrado' });
        }

        run(`
      UPDATE credit_types 
      SET name = ?, interest_rate = ?, interest_type = ?, frequency = ?, 
          max_term_months = ?, late_fee_rate = ?, grace_days = ?, active = ?
      WHERE id = ?
    `, [
            name !== undefined ? name : creditType.name,
            interest_rate !== undefined ? interest_rate : creditType.interest_rate,
            interest_type !== undefined ? interest_type : creditType.interest_type,
            frequency !== undefined ? frequency : creditType.frequency,
            max_term_months !== undefined ? max_term_months : creditType.max_term_months,
            late_fee_rate !== undefined ? late_fee_rate : creditType.late_fee_rate,
            grace_days !== undefined ? grace_days : creditType.grace_days,
            active !== undefined ? active : creditType.active,
            req.params.id
        ]);

        const updatedCreditType = get('SELECT * FROM credit_types WHERE id = ?', [req.params.id]);
        res.json(updatedCreditType);
    } catch (error) {
        console.error('Error actualizando tipo de crédito:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Eliminar tipo de crédito
router.delete('/:id', (req, res) => {
    try {
        // Verificar si hay préstamos con este tipo de crédito
        const loansCount = get('SELECT COUNT(*) as count FROM loans WHERE credit_type_id = ?', [req.params.id]);

        if (loansCount && loansCount.count > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar un tipo de crédito que tiene préstamos asociados. Puede desactivarlo en su lugar.'
            });
        }

        run('DELETE FROM credit_types WHERE id = ?', [req.params.id]);
        res.json({ message: 'Tipo de crédito eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando tipo de crédito:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
