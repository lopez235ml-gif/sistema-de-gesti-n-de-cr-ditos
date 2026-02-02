// Funciones de cálculo para préstamos

/**
 * Calcula el interés simple sobre el periodo completo
 * @param {number} principal - Monto principal
 * @param {number} rate - Tasa de interés (porcentaje sobre el periodo)
 * @returns {number} Interés calculado
 */
function calculateSimpleInterest(principal, rate) {
    return (principal * rate) / 100;
}

/**
 * Calcula el pago mensual para un préstamo con interés simple
 * @param {number} principal - Monto del préstamo
 * @param {number} rate - Tasa de interés (porcentaje sobre el periodo completo)
 * @param {number} months - Número de meses
 * @returns {number} Pago mensual
 */
function calculateMonthlyPayment(principal, rate, months) {
    const totalInterest = calculateSimpleInterest(principal, rate);
    const totalAmount = principal + totalInterest;
    return Math.round((totalAmount / months) * 100) / 100;
}

/**
 * Genera tabla de amortización con interés simple
 * @param {number} principal - Monto del préstamo
 * @param {number} rate - Tasa de interés (porcentaje sobre el periodo)
 * @param {number} months - Número de meses
 * @param {Date} startDate - Fecha de inicio
 * @param {string} frequency - Frecuencia de pago (monthly, weekly, etc.)
 * @returns {Array} Tabla de amortización
 */
function generateAmortizationSchedule(principal, rate, months, startDate, frequency = 'monthly') {
    const schedule = [];
    const totalInterest = calculateSimpleInterest(principal, rate);
    const monthlyPayment = calculateMonthlyPayment(principal, rate, months);

    // Interés fijo por cuota
    const interestPerPayment = Math.round((totalInterest / months) * 100) / 100;

    // Capital fijo por cuota
    const principalPerPayment = Math.round((principal / months) * 100) / 100;

    let balance = principal;

    for (let i = 1; i <= months; i++) {
        // Para la última cuota, ajustar para evitar errores de redondeo
        const isLastPayment = i === months;
        const principalPayment = isLastPayment ? balance : principalPerPayment;
        const interestPayment = isLastPayment ? (totalInterest - (interestPerPayment * (months - 1))) : interestPerPayment;

        balance -= principalPayment;

        // Calcular fecha de pago
        const dueDate = new Date(startDate);
        if (frequency === 'monthly') {
            dueDate.setMonth(dueDate.getMonth() + i);
        } else if (frequency === 'weekly') {
            dueDate.setDate(dueDate.getDate() + (i * 7));
        } else if (frequency === 'biweekly') {
            dueDate.setDate(dueDate.getDate() + (i * 14));
        }

        schedule.push({
            payment_number: i,
            due_date: dueDate.toISOString().split('T')[0],
            payment_amount: Math.round((principalPayment + interestPayment) * 100) / 100,
            principal: Math.round(principalPayment * 100) / 100,
            interest: Math.round(interestPayment * 100) / 100,
            balance: Math.max(0, Math.round(balance * 100) / 100)
        });
    }

    return schedule;
}

/**
 * Calcula la mora (penalización por pago tardío)
 * @param {number} amount - Monto del pago
 * @param {number} lateFeeRate - Tasa de mora (porcentaje)
 * @param {number} daysLate - Días de retraso
 * @param {number} graceDays - Días de gracia
 * @returns {number} Monto de la mora
 */
function calculateLateFee(amount, lateFeeRate, daysLate, graceDays = 0) {
    if (daysLate <= graceDays) return 0;

    const effectiveDays = daysLate - graceDays;
    return Math.round((amount * lateFeeRate / 100) * 100) / 100;
}

/**
 * Calcula cuántos días de retraso tiene un pago
 * @param {string} dueDate - Fecha de vencimiento
 * @param {string} paymentDate - Fecha de pago (opcional, usa hoy si no se proporciona)
 * @returns {number} Días de retraso
 */
function calculateDaysLate(dueDate, paymentDate = null) {
    const due = new Date(dueDate);
    const payment = paymentDate ? new Date(paymentDate) : new Date();

    const diffTime = payment - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}

/**
 * Distribuye un pago entre interés, principal y mora
 * @param {number} paymentAmount - Monto del pago
 * @param {number} interestDue - Interés pendiente
 * @param {number} lateFee - Mora acumulada
 * @returns {Object} Distribución del pago
 */
function distributePayment(paymentAmount, interestDue, lateFee = 0) {
    let remaining = paymentAmount;

    // Primero se paga la mora
    const lateFeePayment = Math.min(remaining, lateFee);
    remaining -= lateFeePayment;

    // Luego el interés
    const interestPayment = Math.min(remaining, interestDue);
    remaining -= interestPayment;

    // El resto va al principal
    const principalPayment = remaining;

    return {
        late_fee: Math.round(lateFeePayment * 100) / 100,
        interest: Math.round(interestPayment * 100) / 100,
        principal: Math.round(principalPayment * 100) / 100
    };
}

module.exports = {
    calculateSimpleInterest,
    calculateMonthlyPayment,
    generateAmortizationSchedule,
    calculateLateFee,
    calculateDaysLate,
    distributePayment
};
