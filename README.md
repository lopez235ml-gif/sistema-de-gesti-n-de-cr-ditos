# Sistema de Gestión de Créditos y Préstamos

Sistema web completo para la administración de créditos, préstamos, clientes, solicitudes, aprobaciones, pagos y cobranzas.

## 🚀 Características

- **Gestión de Clientes**: Registro completo de clientes con información de contacto
- **Tipos de Crédito**: Configuración flexible de productos crediticios con tasas y términos personalizables
- **Solicitudes y Aprobaciones**: Flujo de trabajo para solicitar y aprobar préstamos
- **Préstamos Activos**: Seguimiento de préstamos con tablas de amortización
- **Pagos y Cobranzas**: Registro de pagos con cálculo automático de intereses y mora
- **Generación de Recibos**: Recibos automáticos en HTML para cada pago
- **Control de Mora**: Panel de clientes con pagos atrasados
- **Dashboard Interactivo**: Resumen visual de estadísticas clave

## 📋 Requisitos

- Node.js 14 o superior
- npm o yarn

## 🔧 Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar el servidor:
```bash
npm start
```

3. Abrir en el navegador:
```
http://localhost:3000
```

## 🔑 Credenciales por Defecto

- **Usuario**: admin
- **Contraseña**: Admin123!

## 📁 Estructura del Proyecto

```
GRAVITY/
├── server.js                 # Servidor Express principal
├── database.js              # Configuración de base de datos SQLite
├── auth.js                  # Middleware de autenticación JWT
├── package.json             # Dependencias del proyecto
├── routes/                  # Rutas de la API
│   ├── auth.routes.js       # Autenticación
│   ├── clients.routes.js    # Gestión de clientes
│   ├── credit-types.routes.js # Tipos de crédito
│   ├── loan-requests.routes.js # Solicitudes
│   ├── loans.routes.js      # Préstamos
│   └── payments.routes.js   # Pagos y cobranzas
├── utils/                   # Utilidades
│   ├── calculations.js      # Cálculos de intereses
│   └── receipt-generator.js # Generación de recibos
└── public/                  # Frontend
    ├── index.html
    ├── css/
    │   └── styles.css       # Sistema de diseño
    └── js/
        ├── app.js           # Aplicación SPA
        ├── api.js           # Cliente API
        └── views/           # Vistas de la aplicación
            ├── login.js
            ├── dashboard.js
            ├── clients.js
            ├── credit-types.js
            ├── loan-requests.js
            ├── loans.js
            └── payments.js
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Clientes
- `GET /api/clients` - Listar clientes
- `GET /api/clients/:id` - Obtener cliente
- `POST /api/clients` - Crear cliente
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente

### Tipos de Crédito
- `GET /api/credit-types` - Listar tipos
- `POST /api/credit-types` - Crear tipo
- `PUT /api/credit-types/:id` - Actualizar tipo
- `DELETE /api/credit-types/:id` - Eliminar tipo

### Solicitudes
- `GET /api/loan-requests` - Listar solicitudes
- `POST /api/loan-requests` - Crear solicitud
- `PUT /api/loan-requests/:id/approve` - Aprobar solicitud
- `PUT /api/loan-requests/:id/reject` - Rechazar solicitud

### Préstamos
- `GET /api/loans` - Listar préstamos
- `GET /api/loans/:id` - Detalle de préstamo
- `GET /api/loans/:id/schedule` - Tabla de amortización

### Pagos
- `GET /api/payments` - Listar pagos
- `GET /api/payments/overdue` - Pagos en mora
- `POST /api/payments` - Registrar pago
- `GET /api/payments/:id/receipt` - Generar recibo

## 💡 Uso del Sistema

### 1. Configurar Tipos de Crédito
- Ir a "Tipos de Crédito"
- Crear nuevos tipos con tasas de interés, plazos y configuración de mora

### 2. Registrar Clientes
- Ir a "Clientes"
- Agregar información completa del cliente

### 3. Crear Solicitud de Préstamo
- Ir a "Solicitudes"
- Seleccionar cliente y tipo de crédito
- Ingresar monto y plazo

### 4. Aprobar Solicitud
- Revisar solicitud pendiente
- Aprobar y establecer fecha del primer pago
- El sistema crea automáticamente el préstamo

### 5. Registrar Pagos
- Ir a "Pagos"
- Seleccionar préstamo
- El sistema calcula automáticamente intereses y mora
- Generar recibo automático

### 6. Monitorear Mora
- El dashboard muestra clientes con pagos atrasados
- Panel de mora en "Pagos" con días de atraso

## 🎨 Características Técnicas

### Backend
- **Framework**: Express.js
- **Base de Datos**: SQLite (fácilmente migrable a PostgreSQL/MySQL)
- **Autenticación**: JWT (JSON Web Tokens)
- **Validación**: Validación de datos en todas las rutas

### Frontend
- **Arquitectura**: SPA (Single Page Application)
- **Tecnologías**: HTML5, CSS3, JavaScript vanilla
- **Diseño**: Sistema de diseño moderno con dark theme
- **Efectos**: Glassmorphism, gradientes, animaciones

### Cálculos
- Interés simple y compuesto
- Tablas de amortización automáticas
- Cálculo de mora con días de gracia
- Distribución automática de pagos (mora → interés → principal)

## 🔒 Seguridad

- Autenticación JWT en todas las rutas protegidas
- Contraseñas hasheadas con bcrypt
- Validación de datos en backend
- Prevención de eliminación de registros con dependencias

## 📈 Escalabilidad

El sistema está diseñado para ser escalable:

- **Base de datos**: Fácil migración de SQLite a PostgreSQL/MySQL
- **API RESTful**: Arquitectura estándar y bien documentada
- **Frontend modular**: Componentes reutilizables
- **Separación de responsabilidades**: Backend y frontend independientes

## 🛠️ Desarrollo

Para desarrollo con recarga automática, puedes usar nodemon:

```bash
npm install -g nodemon
nodemon server.js
```

## 📝 Notas

- La base de datos se crea automáticamente en `database.db`
- Los recibos se generan en HTML y se pueden imprimir
- El sistema calcula automáticamente los días de mora
- Las tablas de amortización se generan dinámicamente

## 🤝 Soporte

Para cualquier duda o problema, revisa la documentación de la API o contacta al administrador del sistema.

---

**Desarrollado con ❤️ para gestión eficiente de créditos y préstamos**
