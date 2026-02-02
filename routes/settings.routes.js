const express = require('express');
const { query, get, run } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener configuración
router.get('/', (req, res) => {
    try {
        const settings = query('SELECT * FROM settings');
        const config = {};

        settings.forEach(s => {
            config[s.key] = s.value;
        });

        res.json(config);
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Actualizar configuración
router.put('/', (req, res) => {
    try {
        const updates = req.body; // Objeto { key: value, ... }

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No se enviaron datos para actualizar' });
        }

        const keys = Object.keys(updates);

        keys.forEach(key => {
            // Verificar si la clave existe para asegurar integridad
            const exists = get('SELECT id FROM settings WHERE key = ?', [key]);

            if (exists) {
                run('UPDATE settings SET value = ? WHERE key = ?', [updates[key], key]);
            }
        });

        res.json({ message: 'Configuración actualizada correctamente' });
    } catch (error) {
        console.error('Error actualizando configuración:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Descargar copia de seguridad
router.get('/backup', (req, res) => {
    try {
        const path = require('path');
        const fs = require('fs');
        const dbPath = path.join(__dirname, '../database.db');

        if (fs.existsSync(dbPath)) {
            const date = new Date().toISOString().split('T')[0];
            res.download(dbPath, `backup-gravity-${date}.db`);
        } else {
            res.status(404).json({ error: 'Base de datos no encontrada' });
        }
    } catch (error) {
        console.error('Error generando backup:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
