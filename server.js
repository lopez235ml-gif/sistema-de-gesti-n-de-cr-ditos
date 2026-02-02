const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar base de datos
const { initDatabase } = require('./database');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const clientsRoutes = require('./routes/clients.routes');
const creditTypesRoutes = require('./routes/credit-types.routes');
const loanRequestsRoutes = require('./routes/loan-requests.routes');
const loansRoutes = require('./routes/loans.routes');
const paymentsRoutes = require('./routes/payments.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/credit-types', creditTypesRoutes);
app.use('/api/loan-requests', loanRequestsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/expenses', require('./routes/expenses.routes'));
app.use('/api/documents', require('./routes/documents.routes'));
app.use('/api/portal', require('./routes/portal.routes'));

// Ruta principal - servir la aplicación
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo salió mal!' });
});

// Iniciar servidor después de inicializar la base de datos
async function startServer() {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log('🚀 Sistema de Gestión de Créditos y Préstamos');
            console.log('='.repeat(50));
            console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
            console.log(`✓ Base de datos inicializada`);
            console.log(`✓ Credenciales admin: admin / Admin123!`);
            console.log('='.repeat(50));
        });
    } catch (error) {
        console.error('Error iniciando servidor:', error);
        process.exit(1);
    }
}

startServer();
