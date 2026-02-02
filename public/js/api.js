// API Client para comunicación con el backend

const API_URL = '/api';

// Obtener token del localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Guardar token
function setToken(token) {
    localStorage.setItem('token', token);
}

// Eliminar token
function removeToken() {
    localStorage.removeItem('token');
}

// Realizar petición HTTP
async function request(endpoint, options = {}) {
    const token = getToken();

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);

        if (response.status === 401) {
            removeToken();
            window.location.hash = '#/login';
            throw new Error('No autorizado');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en la petición');
        }

        return data;
    } catch (error) {
        console.error('Error en petición:', error);
        throw error;
    }
}

// API de autenticación
const authAPI = {
    login: (username, password) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        }),

    getCurrentUser: () => request('/auth/me'),

    logout: () => {
        removeToken();
        window.location.hash = '#/login';
    }
};

// API de clientes
const clientsAPI = {
    getAll: () => request('/clients'),

    getById: (id) => request(`/clients/${id}`),

    create: (client) => request('/clients', {
        method: 'POST',
        body: JSON.stringify(client)
    }),

    update: (id, client) => request(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(client)
    }),

    delete: (id) => request(`/clients/${id}`, {
        method: 'DELETE'
    })
};

// API de tipos de crédito
const creditTypesAPI = {
    getAll: () => request('/credit-types'),

    getById: (id) => request(`/credit-types/${id}`),

    create: (creditType) => request('/credit-types', {
        method: 'POST',
        body: JSON.stringify(creditType)
    }),

    update: (id, creditType) => request(`/credit-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(creditType)
    }),

    delete: (id) => request(`/credit-types/${id}`, {
        method: 'DELETE'
    })
};

// API de solicitudes de préstamo
const loanRequestsAPI = {
    getAll: (status = null) => {
        const query = status ? `?status=${status}` : '';
        return request(`/loan-requests${query}`);
    },

    getById: (id) => request(`/loan-requests/${id}`),

    create: (loanRequest) => request('/loan-requests', {
        method: 'POST',
        body: JSON.stringify(loanRequest)
    }),

    approve: (id, data) => request(`/loan-requests/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    reject: (id, notes) => request(`/loan-requests/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
    })
};

// API de préstamos
const loansAPI = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return request(`/loans?${params}`);
    },

    getById: (id) => request(`/loans/${id}`),

    getSchedule: (id) => request(`/loans/${id}/schedule`),

    updateStatus: (id, status) => request(`/loans/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    })
};

// API de pagos
const paymentsAPI = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return request(`/payments?${params}`);
    },

    getOverdue: () => request('/payments/overdue'),

    create: (payment) => request('/payments', {
        method: 'POST',
        body: JSON.stringify(payment)
    }),

    getReceipt: async (id) => {
        try {
            const token = getToken();
            const response = await fetch(`${API_URL}/payments/${id}/receipt`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error obteniendo recibo');
            }

            const html = await response.text();
            const newWindow = window.open('', '_blank');
            newWindow.document.write(html);
            newWindow.document.close();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al generar el recibo');
        }
    }
};

// API de reportes
const reportsAPI = {
    getPortfolioSummary: () => request('/reports/portfolio-summary'),

    getCollectionMetrics: (period = 'month') => request(`/reports/collection-metrics?period=${period}`),

    getInterestAnalysis: () => request('/reports/interest-analysis'),

    getOverdueAnalysis: () => request('/reports/overdue-analysis'),

    getDailyCollections: (date) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return request(`/reports/daily-collections?date=${targetDate}`);
    }
};

// API de configuración
const settingsAPI = {
    getAll: () => request('/settings'),
    update: (data) => request('/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
    })
};

// API de Gastos
const expensesAPI = {
    getAll: (filters) => {
        const query = new URLSearchParams(filters).toString();
        return request(`/expenses?${query}`);
    },
    create: (data) => request('/expenses', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    delete: (id) => request(`/expenses/${id}`, {
        method: 'DELETE'
    })
};

// API de Documentos
const documentsAPI = {
    getByClient: (clientId) => request(`/documents/client/${clientId}`),

    upload: (formData) => {
        // Upload requiere manejo especial porque envia FormData, no JSON
        const token = localStorage.getItem('token');
        return fetch('/api/documents/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // No setear Content-Type, fetch lo pone automático con boundary para FormData
            },
            body: formData
        }).then(async res => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Error subiendo archivo');
            }
            return res.json();
        });
    },

    delete: (id) => request(`/documents/${id}`, {
        method: 'DELETE'
    }),

    getDownloadUrl: (id) => {
        const token = localStorage.getItem('token');
        return `/api/documents/download/${id}?token=${token}`; // Nota: El backend requiere token en header, esto fallaría en img src directo si no ajustamos el backend.
        // Ajuste temporal: Para descargas directas via browser link, lo mejor es usar window.open con token en query param si el backend lo soporta, 
        // o usar el método fetch blob como hicimos en backup.
        // Dado el uso, haré una función helper en la vista para descargar.
    }
};
