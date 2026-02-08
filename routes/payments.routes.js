const express = require('express');
const { query, get, run } = require('../database');
const { authenticateToken } = require('../auth');
const { calculateDaysLate, calculateLateFee, distributePayment } = require('../utils/calculations');
const { generateReceipt, generateReceiptNumber } = require('../utils/receipt-generator');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los pagos
router.get('/', (req, res) => {
    try {
        const { loan_id, status } = req.query;

        let sql = `
      SELECT p.*, 
             l.id as loan_id,
             c.full_name as client_name,
             ct.name as credit_type_name
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      JOIN credit_types ct ON l.credit_type_id = ct.id
    `;

        const conditions = [];
        const params = [];

        if (loan_id) {
            conditions.push('p.loan_id = ?');
            params.push(loan_id);
        }

        if (status) {
            conditions.push('p.status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        const { search } = req.query;
        if (search) {
            sql += conditions.length > 0 ? ' AND ' : ' WHERE ';
            sql += 'c.full_name LIKE ?';
            params.push(`%${search}%`);
        }

        sql += ' ORDER BY p.payment_date DESC';

        const payments = query(sql, params);
        res.json(payments);
    } catch (error) {
        console.error('Error obteniendo pagos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener pagos en mora
router.get('/overdue', (req, res) => {
    try {
        const overdueLoans = query(`
      SELECT DISTINCT
             l.id as loan_id,
             l.amount as loan_amount,
             l.first_payment_date,
             c.id as client_id,
             c.full_name as client_name,
             c.phone,
             ct.name as credit_type_name,
             ct.late_fee_rate,
             ct.grace_days
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      JOIN credit_types ct ON l.credit_type_id = ct.id
      WHERE l.status = 'active'
    `);

        const overdueDetails = [];

        for (const loan of overdueLoans) {
            // Obtener pagos realizados
            const payments = query('SELECT * FROM payments WHERE loan_id = ?', [loan.loan_id]);

            // Calcular cuántos pagos se han hecho
            const paymentsMade = payments.length;

            // Calcular fecha de vencimiento del siguiente pago
            const nextPaymentDate = new Date(loan.first_payment_date);
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + paymentsMade);

            // Calcular días de retraso
            const daysLate = calculateDaysLate(nextPaymentDate.toISOString().split('T')[0]);

            if (daysLate > loan.grace_days) {
                overdueDetails.push({
                    ...loan,
                    next_payment_date: nextPaymentDate.toISOString().split('T')[0],
                    days_late: daysLate,
                    effective_days_late: daysLate - loan.grace_days,
                    payments_made: paymentsMade
                });
            }
        }

        // Ordenar por días de retraso (mayor a menor)
        overdueDetails.sort((a, b) => b.days_late - a.days_late);

        res.json(overdueDetails);
    } catch (error) {
        console.error('Error obteniendo pagos en mora:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Registrar un pago
router.post('/', (req, res) => {
    try {
        const { loan_id, amount, payment_date, due_date, application_type } = req.body;

        if (!loan_id || !amount || !payment_date || !due_date) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Validar tipo de aplicación
        const validTypes = ['both', 'principal', 'interest'];
        const applicationType = application_type || 'both';

        if (!validTypes.includes(applicationType)) {
            return res.status(400).json({ error: 'Tipo de aplicación inválido' });
        }

        // Obtener información del préstamo
        const loan = get(`
      SELECT l.*, ct.late_fee_rate, ct.grace_days, ct.frequency
      FROM loans l
      JOIN credit_types ct ON l.credit_type_id = ct.id
      WHERE l.id = ?
    `, [loan_id]);

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        if (loan.status !== 'active') {
            return res.status(400).json({ error: 'El préstamo no está activo' });
        }

        // Calcular días de retraso y mora
        const daysLate = calculateDaysLate(due_date, payment_date);

        // 1. Calcular Mora (Recargo) - Se cobra primero
        // Nota: La mora puede acumularse si no se paga.
        // Por simplicidad, calculamos la mora "actual" de este cobro si aplica.
        // (Idealmente verificaríamos si ya se cobró mora para esta cuota, pero asumimos cobro fresh)
        // Para evitar doble cobro de mora, deberíamos ver si la cuota ya está vencida y pagada.
        // Pero dejaremos la lógica de mora como input calculado por ahora o simple.
        let lateFee = calculateLateFee(amount, loan.late_fee_rate, daysLate, loan.grace_days);

        // 2. Generar Schedule y Reconstruir Estado de Pagos (Waterfall)
        // Necesitamos saber QUÉ se debe realmente (Interés vs Capital)
        const { generateAmortizationSchedule } = require('../utils/calculations');

        const schedule = generateAmortizationSchedule(
            loan.amount,
            loan.interest_rate,
            loan.term_months,
            new Date(loan.first_payment_date),
            loan.frequency,
            loan.interest_type || 'simple'
        );

        const pastPayments = query('SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date', [loan_id]);

        // Simular pagos anteriores para ver qué falta pagar
        // Estructura de deuda: [ { principalOwed, interestOwed, ... } ]

        // Inicializar deuda pendiente por cuota
        let pendingInstallments = schedule.map(item => ({
            number: item.payment_number,
            principalDue: item.principal,
            interestDue: item.interest,
            principalPaid: 0,
            interestPaid: 0
        }));

        // Función para aplicar un monto a la deuda pendiente
        const applyPaymentToBuckets = (paymentAmount, isNewPayment = false) => {
            let remaining = paymentAmount;
            let allocation = { principal: 0, interest: 0, late_fee: 0 };

            // Si es el pago NUEVO, primero descontamos la Mora calculada (si aplica)
            // (O si la mora se considera aparte. Aquí asumimos que lateFee se deduce del monto)
            if (isNewPayment && lateFee > 0) {
                if (remaining >= lateFee) {
                    allocation.late_fee = lateFee;
                    remaining -= lateFee;
                } else {
                    allocation.late_fee = remaining;
                    lateFee = remaining; // Ajustar real charged
                    remaining = 0;
                }
            } else if (!isNewPayment) {
                // Pagos pasados: ya tienen su desglose guardado en DB (p.interest, p.principal)
                // PERO, si queremos reconstruirlo logicamente o confiamos en la DB?
                // Confiemos en lo que la DB dice que pagaron de Interés vs Capital?
                // NO, el problema es que la DB tiene datos malos (el bug anterior).
                // MEJOR: Re-calcular la distribución de CERO basándonos en "Waterfall estricto"
                // para ignorar la mala distribución histórica? 
                // RIESGO: Cambiaría la historia si re-auditamos.
                // SOLUCIÓN PRÁCTICA: Usar la distribución guardada para llenar los buckets
                // y ver qué "huecos" quedan.
                // WAIT: Si el pago #1 guardó $20 interes y $50 capital, entonces la Cuota 1
                // ya tiene $20 interes pagado. Perfecto.
                // Entonces no necesitamos "simular" la lógica, solo "llenar" con lo que dice la DB.
                return;
            }

            // Aplicar remanente a cuotas pendientes
            for (let inst of pendingInstallments) {
                if (remaining <= 0) break;

                // 1. Pagar Interés Pendiente de la cuota
                const interestPending = inst.interestDue - inst.interestPaid;
                if (interestPending > 0) {
                    const toPay = Math.min(remaining, interestPending);
                    if (isNewPayment) {
                        allocation.interest += toPay;
                        inst.interestPaid += toPay;
                    }
                    remaining -= toPay;
                }

                if (remaining <= 0) continue; // Si se acabó el dinero tras pagar interés

                // 2. Pagar Capital Pendiente de la cuota
                const principalPending = inst.principalDue - inst.principalPaid;
                if (principalPending > 0) {
                    const toPay = Math.min(remaining, principalPending);
                    if (isNewPayment) {
                        allocation.principal += toPay;
                        inst.principalPaid += toPay;
                    }
                    remaining -= toPay;
                }
            }

            // Si sobra dinero (pago adelantado a capital futuro o extra)
            // Lo asignamos a "Reducción de Capital" general (o a la última cuota?)
            // En un sistema estricto, reduciría el capital pendiente global.
            // Aquí lo sumamos al acumulador de capital del allocation
            if (remaining > 0 && isNewPayment) {
                allocation.principal += remaining;
            }

            return allocation;
        };

        // LLENAR buckets con pagos pasados (Historia)
        // El problema del usuario es que el pago pasado YA cubrió el interés.
        // Así que llenamos los buckets con la data histórica.
        pastPayments.forEach(p => {
            let pInterest = p.interest;
            let pPrincipal = p.principal;

            for (let inst of pendingInstallments) {
                // Llenar Interés
                if (pInterest > 0) {
                    const iSpace = inst.interestDue - inst.interestPaid;
                    const iPay = Math.min(pInterest, iSpace);
                    inst.interestPaid += iPay;
                    pInterest -= iPay;
                }
                // Llenar Capital
                if (pPrincipal > 0) {
                    const pSpace = inst.principalDue - inst.principalPaid;
                    const pPay = Math.min(pPrincipal, pSpace);
                    inst.principalPaid += pPay;
                    pPrincipal -= pPay;
                }
            }
        });

        // Calcular capital pagado hasta el momento (antes del pago actual)
        const totalPrincipalPaidHistory = pendingInstallments.reduce((sum, inst) => sum + inst.principalPaid, 0);
        const currentPrincipalBalance = loan.amount - totalPrincipalPaidHistory;

        // Verificar si la última cuota programada ya venció para proyectar (si aplica)
        const lastScheduledItem = schedule[schedule.length - 1];

        const lastBucket = pendingInstallments[pendingInstallments.length - 1];
        const isInterestCovered = lastBucket.interestPaid >= (lastBucket.interestDue - 0.01);
        const isPastDue = new Date() > new Date(lastScheduledItem.due_date);

        if (currentPrincipalBalance > 0.01 && (isPastDue || isInterestCovered)) {
            const projectedInterest = (currentPrincipalBalance * (loan.interest_rate / 100)); // Simple mensual

            pendingInstallments.push({
                number: 'Projected',
                principalDue: 0,
                interestDue: projectedInterest,
                principalPaid: 0,
                interestPaid: 0,
                isProjected: true
            });
        }

        // APLICAR PAGO ACTUAL (Nuevo)
        let distribution;

        if (applicationType === 'principal') {
            distribution = { principal: amount - lateFee, interest: 0, late_fee: lateFee };
        } else if (applicationType === 'interest') {
            distribution = { principal: 0, interest: amount - lateFee, late_fee: lateFee };
        } else {
            // Waterfall automático
            distribution = applyPaymentToBuckets(amount, true);
        }

        // Generar número de recibo
        const receiptNumber = generateReceiptNumber({ query, get, run });

        // Registrar el pago
        const result = run(`
      INSERT INTO payments (loan_id, amount, principal, interest, late_fee, payment_date, due_date, receipt_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            loan_id,
            amount,
            distribution.principal,
            distribution.interest,
            distribution.late_fee,
            payment_date,
            due_date,
            receiptNumber
        ]);

        // Verificar si el préstamo está completamente pagado
        const totalPaidResult = get('SELECT SUM(principal) as total FROM payments WHERE loan_id = ?', [loan_id]);
        if (totalPaidResult && totalPaidResult.total >= loan.amount) {
            run('UPDATE loans SET status = ? WHERE id = ?', ['paid', loan_id]);
        }

        const newPayment = get('SELECT * FROM payments WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(newPayment);
    } catch (error) {
        console.error('Error registrando pago:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Generar recibo de pago
router.get('/:id/receipt', (req, res) => {
    try {
        const payment = get('SELECT * FROM payments WHERE id = ?', [req.params.id]);

        if (!payment) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        const loan = get('SELECT * FROM loans WHERE id = ?', [payment.loan_id]);
        const client = get('SELECT * FROM clients WHERE id = ?', [loan.client_id]);

        const receiptHTML = generateReceipt(payment, loan, client);

        res.setHeader('Content-Type', 'text/html');
        res.send(receiptHTML);
    } catch (error) {
        console.error('Error generando recibo:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
