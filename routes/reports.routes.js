const express = require('express');
const { query, get, run } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Resumen general de la cartera
router.get('/portfolio-summary', (req, res) => {
    try {
        // Total prestado (préstamos activos)
        const activeLoans = query(`
      SELECT SUM(amount) as total, COUNT(*) as count
      FROM loans
      WHERE status = 'active'
    `);
        const totalLent = activeLoans[0]?.total || 0;
        const activeLoansCount = activeLoans[0]?.count || 0;

        // Total cobrado (capital)
        const collectedResult = query('SELECT SUM(principal) as total FROM payments');
        const totalCollected = collectedResult[0]?.total || 0;

        // Calcular saldo pendiente por préstamo activo
        const activeLoansWithBalance = query(`
      SELECT 
        l.id,
        l.amount,
        COALESCE(SUM(p.principal), 0) as paid
      FROM loans l
      LEFT JOIN payments p ON l.id = p.loan_id
      WHERE l.status = 'active'
      GROUP BY l.id, l.amount
    `);

        let totalPending = 0;
        for (const loan of activeLoansWithBalance) {
            totalPending += (loan.amount - loan.paid);
        }

        // Intereses ganados
        const interestResult = query('SELECT SUM(interest) as total FROM payments');
        const totalInterest = interestResult[0]?.total || 0;

        // Mora cobrada
        const lateFeeResult = query('SELECT SUM(late_fee) as total FROM payments');
        const totalLateFees = lateFeeResult[0]?.total || 0;

        // Préstamos pagados
        const paidLoans = query(`
      SELECT COUNT(*) as count
      FROM loans
      WHERE status = 'paid'
    `);
        const paidLoansCount = paidLoans[0]?.count || 0;

        res.json({
            totalLent: Math.round(totalLent * 100) / 100,
            totalCollected: Math.round(totalCollected * 100) / 100,
            totalPending: Math.round(totalPending * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalLateFees: Math.round(totalLateFees * 100) / 100,
            activeLoansCount,
            paidLoansCount,
            recoveryRate: totalLent > 0 ? Math.round((totalCollected / totalLent) * 100 * 100) / 100 : 0
        });
    } catch (error) {
        console.error('Error obteniendo resumen de cartera:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Métricas de cobranza por periodo
router.get('/collection-metrics', (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let startDate, endDate;
        const today = new Date();

        switch (period) {
            case 'today':
                startDate = today.toISOString().split('T')[0];
                endDate = startDate;
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                startDate = weekStart.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            default:
                startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
        }

        // Pagos del periodo
        const payments = query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(principal) as total_principal,
        SUM(interest) as total_interest,
        SUM(late_fee) as total_late_fee
      FROM payments
      WHERE payment_date BETWEEN ? AND ?
    `, [startDate, endDate]);

        const result = payments[0] || {};

        res.json({
            period,
            startDate,
            endDate,
            paymentsCount: result.count || 0,
            totalAmount: Math.round((result.total_amount || 0) * 100) / 100,
            totalPrincipal: Math.round((result.total_principal || 0) * 100) / 100,
            totalInterest: Math.round((result.total_interest || 0) * 100) / 100,
            totalLateFee: Math.round((result.total_late_fee || 0) * 100) / 100
        });
    } catch (error) {
        console.error('Error obteniendo métricas de cobranza:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Análisis de intereses
router.get('/interest-analysis', (req, res) => {
    try {
        // Intereses cobrados
        const collectedInterest = query('SELECT SUM(interest) as total FROM payments');
        const totalCollected = collectedInterest[0]?.total || 0;

        // Calcular intereses pendientes de todos los préstamos activos
        const activeLoans = query(`
      SELECT 
        l.id,
        l.amount,
        l.interest_rate,
        l.term_months,
        COALESCE(SUM(p.interest), 0) as interest_paid
      FROM loans l
      LEFT JOIN payments p ON l.id = p.loan_id
      WHERE l.status = 'active'
      GROUP BY l.id, l.amount, l.interest_rate, l.term_months
    `);

        let totalPending = 0;
        for (const loan of activeLoans) {
            // Interés total del préstamo = monto × tasa / 100
            const totalInterest = (loan.amount * loan.interest_rate) / 100;
            const pendingInterest = totalInterest - loan.interest_paid;
            totalPending += pendingInterest;
        }

        // Intereses del mes actual
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = today.toISOString().split('T')[0];

        const monthInterest = query(`
      SELECT SUM(interest) as total
      FROM payments
      WHERE payment_date BETWEEN ? AND ?
    `, [monthStart, monthEnd]);
        const thisMonthInterest = monthInterest[0]?.total || 0;

        res.json({
            totalCollected: Math.round(totalCollected * 100) / 100,
            totalPending: Math.round(totalPending * 100) / 100,
            thisMonthInterest: Math.round(thisMonthInterest * 100) / 100,
            totalExpected: Math.round((totalCollected + totalPending) * 100) / 100
        });
    } catch (error) {
        console.error('Error en análisis de intereses:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Análisis de cartera vencida
router.get('/overdue-analysis', (req, res) => {
    try {
        const overdueLoans = query(`
      SELECT 
        l.id,
        l.amount,
        l.first_payment_date,
        l.term_months,
        c.full_name as client_name,
        COALESCE(SUM(p.principal), 0) as paid_principal
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      LEFT JOIN payments p ON l.id = p.loan_id
      WHERE l.status = 'active'
      GROUP BY l.id, l.amount, l.first_payment_date, l.term_months, c.full_name
    `);

        let overdueAmount = 0;
        let overdueCount = 0;
        let totalDaysLate = 0;
        const overdueDetails = [];

        const today = new Date();

        for (const loan of overdueLoans) {
            // Calcular cuántos pagos debería haber hecho
            const firstPayment = new Date(loan.first_payment_date);
            const monthsSinceStart = Math.floor((today - firstPayment) / (1000 * 60 * 60 * 24 * 30));
            const expectedPayments = Math.min(monthsSinceStart, loan.term_months);

            // Contar cuántos pagos ha hecho
            const paymentsMade = query('SELECT COUNT(*) as count FROM payments WHERE loan_id = ?', [loan.id]);
            const actualPayments = paymentsMade[0]?.count || 0;

            // Si tiene pagos atrasados
            if (actualPayments < expectedPayments) {
                const balance = loan.amount - loan.paid_principal;
                overdueAmount += balance;
                overdueCount++;

                // Calcular días de atraso
                const nextPaymentDate = new Date(firstPayment);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + actualPayments);
                const daysLate = Math.floor((today - nextPaymentDate) / (1000 * 60 * 60 * 24));
                totalDaysLate += daysLate;

                overdueDetails.push({
                    loanId: loan.id,
                    clientName: loan.client_name,
                    balance: Math.round(balance * 100) / 100,
                    daysLate: Math.max(0, daysLate),
                    paymentsMissed: expectedPayments - actualPayments
                });
            }
        }

        // Calcular % de cartera vencida
        const totalActive = query(`
      SELECT SUM(l.amount - COALESCE(p.paid, 0)) as total
      FROM loans l
      LEFT JOIN (
        SELECT loan_id, SUM(principal) as paid
        FROM payments
        GROUP BY loan_id
      ) p ON l.id = p.loan_id
      WHERE l.status = 'active'
    `);
        const totalActiveAmount = totalActive[0]?.total || 0;
        const overduePercentage = totalActiveAmount > 0 ? (overdueAmount / totalActiveAmount) * 100 : 0;

        res.json({
            overdueAmount: Math.round(overdueAmount * 100) / 100,
            overdueCount,
            averageDaysLate: overdueCount > 0 ? Math.round(totalDaysLate / overdueCount) : 0,
            overduePercentage: Math.round(overduePercentage * 100) / 100,
            overdueLoans: overdueDetails.slice(0, 10) // Top 10
        });
    } catch (error) {
        console.error('Error en análisis de mora:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Cobros del día
router.get('/daily-collections', (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const collections = query(`
      SELECT 
        p.*,
        c.full_name as client_name,
        l.amount as loan_amount,
        ct.name as credit_type
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      JOIN credit_types ct ON l.credit_type_id = ct.id
      WHERE p.payment_date = ?
      ORDER BY p.id DESC
    `, [targetDate]);

        const summary = query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total
      FROM payments
      WHERE payment_date = ?
    `, [targetDate]);

        res.json({
            date: targetDate,
            collections,
            summary: {
                count: summary[0]?.count || 0,
                total: Math.round((summary[0]?.total || 0) * 100) / 100
            }
        });
    } catch (error) {
        console.error('Error obteniendo cobros del día:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ==========================================
// Rutas de Exportación (Excel/CSV)
// ==========================================
const { convertToCSV } = require('../utils/csv-exporter');

// Exportar Cobranza (Pagos)
router.get('/export/collections', (req, res) => {
    try {
        const { period = 'month' } = req.query;
        let startDate, endDate;
        const today = new Date();

        // Reutilizar lógica de fechas (simplificada)
        if (period === 'today') {
            startDate = endDate = today.toISOString().split('T')[0];
        } else if (period === 'week') {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            startDate = weekStart.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
        } else { // default month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
        }

        const payments = query(`
            SELECT 
                p.id, p.payment_date, p.amount, p.principal, p.interest, p.late_fee, p.receipt_number,
                c.full_name as client_name,
                ct.name as credit_type
            FROM payments p
            JOIN loans l ON p.loan_id = l.id
            JOIN clients c ON l.client_id = c.id
            JOIN credit_types ct ON l.credit_type_id = ct.id
            WHERE p.payment_date BETWEEN ? AND ?
            ORDER BY p.payment_date DESC
        `, [startDate, endDate]);

        const columns = [
            { key: 'payment_date', header: 'Fecha', format: 'date' },
            { key: 'receipt_number', header: 'Recibo' },
            { key: 'client_name', header: 'Cliente' },
            { key: 'credit_type', header: 'Tipo Crédito' },
            { key: 'amount', header: 'Total Pagado', format: 'currency' },
            { key: 'principal', header: 'Capital', format: 'currency' },
            { key: 'interest', header: 'Interés', format: 'currency' },
            { key: 'late_fee', header: 'Mora', format: 'currency' }
        ];

        const csv = convertToCSV(payments, columns);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename=cobranza_${period}_${startDate}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('Error exportando cobranza:', error);
        res.status(500).send('Error generando reporte');
    }
});

// Exportar Cartera Activa
router.get('/export/active-portfolio', (req, res) => {
    try {
        const loans = query(`
            SELECT 
                l.id, l.amount, l.interest_rate, l.term_months, l.approved_date, l.first_payment_date, l.status,
                c.full_name as client_name, c.id_number,
                ct.name as credit_type,
                (l.amount - COALESCE((SELECT SUM(principal) FROM payments WHERE loan_id = l.id), 0)) as balance
            FROM loans l
            JOIN clients c ON l.client_id = c.id
            JOIN credit_types ct ON l.credit_type_id = ct.id
            WHERE l.status = 'active'
            ORDER BY l.approved_date DESC
        `);

        const columns = [
            { key: 'id', header: 'ID Préstamo' },
            { key: 'client_name', header: 'Cliente' },
            { key: 'id_number', header: 'Cédula/ID' },
            { key: 'credit_type', header: 'Tipo' },
            { key: 'amount', header: 'Monto Original', format: 'currency' },
            { key: 'balance', header: 'Saldo Pendiente', format: 'currency' },
            { key: 'interest_rate', header: 'Tasa %' },
            { key: 'term_months', header: 'Plazo (Meses)' },
            { key: 'approved_date', header: 'Fecha Inicio', format: 'date' },
            { key: 'first_payment_date', header: 'Primer Pago', format: 'date' }
        ];

        const csv = convertToCSV(loans, columns);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename=cartera_activa_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('Error exportando cartera:', error);
        res.status(500).send('Error generando reporte');
    }
});

// Exportar Mora
router.get('/export/overdue', (req, res) => {
    try {
        // ... (Logica simplificada de mora para exportación)
        // Reutilizamos la query, pero filtrando en código o SQL complejo.
        // Para eficiencia en export, hagamos una query directa de quienes deben hoy.
        // Aproximación: préstamos activos donde (hoy > first_payment + payments_made * frequency)
        // Por simplicidad y consistencia, usaremos la misma lógica que el endpoint de JSON pero adaptada.

        const overdueLoans = query(`
            SELECT 
                l.id, l.amount, l.first_payment_date, l.term_months,
                c.full_name as client_name, c.phone,
                ct.name as credit_type,
                COALESCE(SUM(p.principal), 0) as paid_principal,
                COUNT(p.id) as actual_payments
            FROM loans l
            JOIN clients c ON l.client_id = c.id
            JOIN credit_types ct ON l.credit_type_id = ct.id
            LEFT JOIN payments p ON l.id = p.loan_id
            WHERE l.status = 'active'
            GROUP BY l.id
        `);

        const today = new Date();
        const exportData = [];

        for (const loan of overdueLoans) {
            const firstPayment = new Date(loan.first_payment_date);
            const monthsSinceStart = Math.floor((today - firstPayment) / (1000 * 60 * 60 * 24 * 30));
            const expectedPayments = Math.min(monthsSinceStart, loan.term_months);

            // Ajuste: si monthsSinceStart < 0, esperado es 0 (no ha empezado a pagar)
            const reallyExpected = Math.max(0, expectedPayments);

            if (loan.actual_payments < reallyExpected) {
                const balance = loan.amount - loan.paid_principal;
                // Días atrazo aprox
                const nextPaymentDate = new Date(firstPayment);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + loan.actual_payments);
                const daysLate = Math.floor((today - nextPaymentDate) / (1000 * 60 * 60 * 24));

                if (daysLate > 0) {
                    exportData.push({
                        loan_id: loan.id,
                        client_name: loan.client_name,
                        phone: loan.phone,
                        credit_type: loan.credit_type,
                        balance: balance,
                        days_late: daysLate,
                        missed_payments: reallyExpected - loan.actual_payments
                    });
                }
            }
        }

        const columns = [
            { key: 'loan_id', header: 'ID Préstamo' },
            { key: 'client_name', header: 'Cliente' },
            { key: 'phone', header: 'Teléfono' },
            { key: 'credit_type', header: 'Tipo' },
            { key: 'balance', header: 'Saldo Vencido', format: 'currency' },
            { key: 'days_late', header: 'Días Atraso' },
            { key: 'missed_payments', header: 'Cuotas Pendientes' }
        ];

        const csv = convertToCSV(exportData, columns);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename=reporte_mora_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('Error exportando mora:', error);
        res.status(500).send('Error generando reporte');
    }
});

module.exports = router;
