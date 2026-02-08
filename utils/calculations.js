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
/**
 * Genera tabla de amortización
 * @param {number} principal - Monto del préstamo
 * @param {number} rate - Tasa de interés (porcentaje sobre el periodo)
 * @param {number} months - Número de meses
 * @param {Date} startDate - Fecha de inicio
 * @param {string} frequency - Frecuencia de pago (monthly, weekly, etc.)
 * @param {string} interestType - Tipo de interés ('simple', 'reducing')
 * @returns {Array} Tabla de amortización
 */
function generateAmortizationSchedule(principal, rate, months, startDate, frequency = 'monthly', interestType = 'simple') {
    const schedule = [];
    let balance = principal;

    // Convertir tasa del periodo completo a tasa mensual/periódica aproximada
    // Nota: 'rate' viene como porcentaje total del periodo en el sistema actual (e.g. 20% anual/global).
    // Si es 'reducing', asumiremos que 'rate' es la tasa periódica (mensual).
    // OJO: En el sistema actual, `credit_types` almacena `interest_rate`.
    // Si el usuario pone 5%, asumimos que es mensual para 'reducing'.

    let periodicRate = rate / 100; // Por defecto asumimos que el input es la tasa del periodo

    // Lógica para Interés Simple (Flat Rate)
    // El interés se calcula sobre el capital INICIAL siempre.
    if (interestType === 'simple') {
        const totalInterest = calculateSimpleInterest(principal, rate);
        // Recalcular periodicRate efectivo para consistencia interna si fuera necesario, pero mantenemos la lógica flat

        const interestPerPayment = Math.round((totalInterest / months) * 100) / 100;
        const principalPerPayment = Math.round((principal / months) * 100) / 100;

        for (let i = 1; i <= months; i++) {
            const isLastPayment = i === months;
            const principalPayment = isLastPayment ? balance : principalPerPayment;
            const interestPayment = isLastPayment ? (totalInterest - (interestPerPayment * (months - 1))) : interestPerPayment;

            balance -= principalPayment;

            // ... (Fecha lógica igual)
            const dueDate = calculateDueDate(startDate, i, frequency);

            schedule.push({
                payment_number: i,
                due_date: dueDate.toISOString().split('T')[0],
                payment_amount: Math.round((principalPayment + interestPayment) * 100) / 100,
                principal: Math.round(principalPayment * 100) / 100,
                interest: Math.round(interestPayment * 100) / 100,
                balance: Math.max(0, Math.round(balance * 100) / 100)
            });
        }
    }
    // Lógica para Interés Compuesto / Sobre Saldos (Reducing Balance)
    else {
        // Asumimos 'rate' es la tasa MENSUAL/Periódica si es reducing.
        // Si usamos el sistema francés (cuota fija):
        // Cuota = P * r * (1+r)^n / ((1+r)^n - 1)

        // Si rate es 0, división por cero.
        let fixedPayment;
        if (periodicRate === 0) {
            fixedPayment = principal / months;
        } else {
            fixedPayment = principal * periodicRate * Math.pow(1 + periodicRate, months) / (Math.pow(1 + periodicRate, months) - 1);
        }

        for (let i = 1; i <= months; i++) {
            const interestPayment = balance * periodicRate;
            let principalPayment = fixedPayment - interestPayment;

            // Ajuste final
            if (i === months || principalPayment > balance) {
                principalPayment = balance;
                // La cuota final puede variar centavos
            }

            balance -= principalPayment;
            const dueDate = calculateDueDate(startDate, i, frequency);

            schedule.push({
                payment_number: i,
                due_date: dueDate.toISOString().split('T')[0],
                payment_amount: Math.round((principalPayment + interestPayment) * 100) / 100,
                principal: Math.round(principalPayment * 100) / 100,
                interest: Math.round(interestPayment * 100) / 100,
                balance: Math.max(0, Math.round(balance * 100) / 100)
            });
        }
    }

    return schedule;
}

function calculateDueDate(startDate, offset, frequency) {
    const date = new Date(startDate);
    if (frequency === 'monthly') {
        date.setMonth(date.getMonth() + offset);
    } else if (frequency === 'weekly') {
        date.setDate(date.getDate() + (offset * 7));
    } else if (frequency === 'biweekly') {
        date.setDate(date.getDate() + (offset * 14));
    }
    return date;
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
