const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { run, query, get } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Configurar almacenamiento Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Nombre único: timestamp-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Subir documento
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const { client_id, loan_id } = req.body;

        if (!client_id) {
            // Si falla, borrar el archivo subido para no dejar basura
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Client ID es requerido' });
        }

        const result = run(`
      INSERT INTO documents (client_id, loan_id, file_name, file_path, file_type)
      VALUES (?, ?, ?, ?, ?)
    `, [
            client_id,
            loan_id || null,
            req.file.originalname,
            req.file.filename, // Guardamos solo el nombre del archivo, no el path absoluto
            path.extname(req.file.originalname).substring(1) // extensión sin punto
        ]);

        const newDoc = get('SELECT * FROM documents WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(newDoc);

    } catch (error) {
        console.error('Error subiendo documento:', error);
        if (req.file) fs.unlinkSync(req.file.path); // Limpieza en error
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Listar documentos de un cliente
router.get('/client/:client_id', (req, res) => {
    try {
        const docs = query('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC', [req.params.client_id]);
        res.json(docs);
    } catch (error) {
        console.error('Error obteniendo documentos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Descargar documento
router.get('/download/:id', (req, res) => {
    try {
        const doc = get('SELECT * FROM documents WHERE id = ?', [req.params.id]);

        if (!doc) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        const filePath = path.join(__dirname, '../public/uploads/documents', doc.file_path);

        if (fs.existsSync(filePath)) {
            res.download(filePath, doc.file_name);
        } else {
            res.status(404).json({ error: 'Archivo físico no encontrado' });
        }

    } catch (error) {
        console.error('Error descargando documento:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Eliminar documento
router.delete('/:id', (req, res) => {
    try {
        const doc = get('SELECT * FROM documents WHERE id = ?', [req.params.id]);

        if (!doc) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        // Eliminar archivo físico
        const filePath = path.join(__dirname, '../public/uploads/documents', doc.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Eliminar registro DB
        run('DELETE FROM documents WHERE id = ?', [req.params.id]);

        res.json({ message: 'Documento eliminado correctamente' });

    } catch (error) {
        console.error('Error eliminando documento:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
