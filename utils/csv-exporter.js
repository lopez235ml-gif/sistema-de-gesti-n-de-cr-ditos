/**
 * Convierte un array de objetos a formato CSV compatible con Excel (UTF-8 BOM)
 * @param {Array} data - Array de objetos con los datos
 * @param {Array} columns - Array de definiciones de columna { key: 'prop', header: 'Titulo' }
 * @returns {string} String con el contenido CSV
 */
function convertToCSV(data, columns) {
    if (!data || !data.length) {
        return '\uFEFF' + columns.map(c => c.header).join(',');
    }

    const header = columns.map(c => c.header).join(',');

    const rows = data.map(row =>
        columns.map(c => {
            let val = row[c.key];
            if (val === null || val === undefined) val = '';

            // Formatos específicos
            if (c.format === 'currency') {
                val = typeof val === 'number' ? val.toFixed(2) : val;
            } else if (c.format === 'date') {
                val = val ? new Date(val).toLocaleDateString('es-ES') : '';
            }

            // Convertir a string y escapar comillas
            const stringVal = String(val);
            if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
        }).join(',')
    ).join('\n');

    return `\uFEFF${header}\n${rows}`; // \uFEFF es el BOM para que Excel reconozca UTF-8
}

module.exports = { convertToCSV };
