# Trinity CMS Modern - TrinityCore 3.3.5a

CMS moderno y minimalista para servidores WoW TrinityCore 3.3.5a con tecnologías actuales.

## 🚀 Stack Tecnológico

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS
- React Router v6
- Axios + React Query
- Framer Motion (animaciones)

### Backend
- Node.js + Express + TypeScript
- MySQL2 (conexión a bases de datos Trinity)
- JWT Authentication
- SOAP Client (comunicación con worldserver)
- Bcrypt (encriptación de contraseñas)

## 📁 Estructura del Proyecto

```
trinity-cms-modern/
├── frontend/           # Aplicación React
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas principales
│   │   ├── services/      # Servicios API
│   │   ├── hooks/         # Custom hooks
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utilidades
│   └── package.json
│
└── backend/            # API REST
    ├── src/
    │   ├── controllers/   # Controladores
    │   ├── routes/        # Rutas
    │   ├── middleware/    # Middlewares
    │   ├── services/      # Lógica de negocio
    │   ├── models/        # Modelos de datos
    │   └── config/        # Configuración
    └── package.json
```

## 🛠️ Instalación

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- MySQL (TrinityCore databases)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configura tus variables de entorno en .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔧 Configuración

### Backend (.env)
```env
PORT=3001
NODE_ENV=development

# TrinityCore Database
DB_AUTH_HOST=localhost
DB_AUTH_PORT=3306
DB_AUTH_USER=trinity
DB_AUTH_PASSWORD=trinity
DB_AUTH_DATABASE=auth

DB_CHARACTERS_HOST=localhost
DB_CHARACTERS_DATABASE=characters

DB_WORLD_HOST=localhost
DB_WORLD_DATABASE=world

# JWT
JWT_SECRET=tu-secret-key-aqui
JWT_EXPIRES_IN=7d

# SOAP (TrinityCore Remote Access)
SOAP_HOST=localhost
SOAP_PORT=7878
SOAP_USER=admin
SOAP_PASSWORD=admin
```

## 📋 Características Implementadas

- ✅ Sistema de registro de cuentas
- ✅ Sistema de login con JWT
- ✅ Dashboard de usuario
- ✅ Módulo de estado del servidor (realm status)
- ✅ Visualización de personajes
- ✅ Panel de administración básico
- ✅ Sistema de votación
- ✅ Tienda de donaciones (estructura base)

## 🎨 Personalización

El frontend usa TailwindCSS, puedes personalizar los colores y estilos en:
- `frontend/tailwind.config.js`
- `frontend/src/index.css`

## 📚 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de cuenta
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obtener usuario actual

### Servidor
- `GET /api/server/status` - Estado del servidor
- `GET /api/server/stats` - Estadísticas

### Personajes
- `GET /api/characters/:accountId` - Lista de personajes
- `GET /api/characters/online` - Personajes online

## 🔒 Seguridad

- Contraseñas hasheadas con SHA1 (formato TrinityCore)
- JWT para sesiones
- Validación de inputs
- Rate limiting
- CORS configurado

## 📝 Licencia

MIT License

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios.

## 📞 Soporte

Para problemas o preguntas, abre un issue en el repositorio.
