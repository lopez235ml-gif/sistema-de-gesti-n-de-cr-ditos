const express = require('express');
const { query, get, run } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener gastos
router.get('/', (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;

        let sql = 'SELECT * FROM expenses';
        const conditions = [];
        const params = [];

        if (startDate) {
            conditions.push('expense_date >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('expense_date <= ?');
            params.push(endDate);
        }

        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY expense_date DESC';

        const expenses = query(sql, params);
        res.json(expenses);
    } catch (error) {
        console.error('Error obteniendo gastos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Crear nuevo gasto
router.post('/', (req, res) => {
    try {
        const { description, amount, category, expense_date, notes } = req.body;

        if (!description || !amount || !expense_date) {
            return res.status(400).json({ error: 'Descripción, monto y fecha son requeridos' });
        }

        const result = run(`
            INSERT INTO expenses (description, amount, category, expense_date, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [description, amount, category, expense_date, notes || '']);

        const newExpense = get('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(newExpense);
    } catch (error) {
        console.error('Error registrando gasto:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Eliminar gasto
router.delete('/:id', (req, res) => {
    try {
        const expense = get('SELECT * FROM expenses WHERE id = ?', [req.params.id]);

        if (!expense) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Gasto eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando gasto:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
