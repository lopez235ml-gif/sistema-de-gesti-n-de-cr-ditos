const { initDatabase, get, query } = require('./database');
const fs = require('fs');
const logFile = 'debug_output.txt';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

async function debug() {
    try {
        fs.writeFileSync(logFile, ''); // Clear file
        await initDatabase();

        // 1. Find client
        log('Searching for client Damaris...');
        const client = get("SELECT * FROM clients WHERE full_name LIKE '%Damaris%'");

        if (!client) {
            log('Client not found');
            return;
        }

        log('Client found: ' + JSON.stringify(client, null, 2));

        // 2. Get loans
        log(`Getting loans for client ${client.id}...`);
        const loans = query(`
              SELECT l.*, ct.name as credit_type_name 
              FROM loans l
              JOIN credit_types ct ON l.credit_type_id = ct.id
              WHERE l.client_id = ?
              ORDER BY l.created_at DESC
          `, [client.id]);

        log(`Found ${loans.length} loans`);
        loans.forEach(l => log(`Loan ID: ${l.id}, Status: '${l.status}', Amount: ${l.amount}, Type: ${typeof l.status}`));

        // 3. Simulating the route logic
        let totalDebt = 0;
        let activeLoansCount = 0;

        const payments = query(`
              SELECT p.*, l.status as loan_status
              FROM payments p
              JOIN loans l ON p.loan_id = l.id
              WHERE l.client_id = ?
          `, [client.id]);

        log(`Found ${payments.length} payments total for this client`);

        loans.forEach(loan => {
            log(`Checking Loan ${loan.id} with status '${loan.status}'`);
            const isActive = loan.status === 'active';
            const isDefaulted = loan.status === 'defaulted';
            log(`Is status 'active'? ${isActive}`);
            log(`Is status 'defaulted'? ${isDefaulted}`);

            if (isActive || isDefaulted) {
                const loanPayments = payments.filter(p => p.loan_id === loan.id);
                const paidPrincipal = loanPayments.reduce((sum, p) => sum + p.principal, 0);
                const balance = loan.amount - paidPrincipal;

                log(`  > Loan ${loan.id}: Amount=${loan.amount}, PaidPrincipal=${paidPrincipal}, Balance=${balance}`);

                totalDebt += Math.max(0, balance);
                activeLoansCount++;
            } else {
                log(`  > Skipping Loan ${loan.id} because status is not active/defaulted`);
            }
        });

        log('-----------------');
        log('Calculated Active Loans: ' + activeLoansCount);
        log('Calculated Total Debt: ' + totalDebt);
    } catch (error) {
        console.error("Debug error:", error);
        fs.appendFileSync(logFile, "Error: " + error.toString() + '\n');
    }
}

debug();
