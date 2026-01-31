# Guía de Personalización - Trinity CMS Modern

## 🎨 Personalización del Diseño

### Colores y Tema

Los colores principales se configuran en `frontend/tailwind.config.js`:

```javascript
colors: {
  primary: {
    // Cambia estos valores para personalizar el color principal
    500: '#0ea5e9',  // Color principal
    600: '#0284c7',  // Variante oscura
    700: '#0369a1',  // Más oscuro
  },
  dark: {
    // Colores de fondo
    900: '#0a0a0f',  // Fondo más oscuro
    800: '#12121a',  // Fondo oscuro
    700: '#1a1a26',  // Cards
  }
}
```

### Tipografía

Las fuentes se definen en `frontend/tailwind.config.js`:

```javascript
fontFamily: {
  'display': ['Tu Fuente Display', 'sans-serif'],  // Títulos
  'body': ['Tu Fuente Body', 'sans-serif'],        // Texto
}
```

No olvides importar las fuentes en `frontend/index.html`.

### Logo y Favicon

- Reemplaza `/public/vite.svg` con tu logo
- Actualiza el título en `frontend/index.html`

## ⚙️ Configuración del Servidor

### Variables de Entorno Backend

Edita `backend/.env`:

```env
# Información del servidor
SERVER_NAME=Mi Servidor WoW
SERVER_VERSION=3.3.5a
SERVER_RATES_XP=5
SERVER_RATES_GOLD=2
SERVER_RATES_DROP=3

# Base de datos
DB_AUTH_HOST=localhost
DB_AUTH_USER=trinity
DB_AUTH_PASSWORD=tu_password
```

### Rates y Configuración

Los rates del servidor se muestran en la página principal. Configúralos en el archivo `.env` del backend.

## 🛠️ Agregar Nuevos Módulos

### Crear una Nueva Página

1. Crea el componente en `frontend/src/pages/`:

```typescript
// frontend/src/pages/MiNuevaPagina.tsx
import { motion } from 'framer-motion';

export default function MiNuevaPagina() {
  return (
    <div className="min-h-screen bg-gradient-dark py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-gradient">Mi Página</h1>
        {/* Tu contenido aquí */}
      </motion.div>
    </div>
  );
}
```

2. Agrégala a las rutas en `frontend/src/App.tsx`:

```typescript
import MiNuevaPagina from './pages/MiNuevaPagina';

// Dentro de <Routes>
<Route path="/mi-pagina" element={<MiNuevaPagina />} />
```

### Crear un Nuevo Endpoint API

1. Crea el servicio en `backend/src/services/`:

```typescript
// backend/src/services/miservicio.service.ts
class MiServicio {
  async obtenerDatos() {
    // Tu lógica aquí
    return { datos: [] };
  }
}

export default new MiServicio();
```

2. Crea la ruta en `backend/src/routes/`:

```typescript
// backend/src/routes/miservicio.routes.ts
import { Router } from 'express';
import miServicio from '../services/miservicio.service';

const router = Router();

router.get('/datos', async (req, res) => {
  const datos = await miServicio.obtenerDatos();
  res.json({ success: true, datos });
});

export default router;
```

3. Registra la ruta en `backend/src/index.ts`:

```typescript
import miServicioRoutes from './routes/miservicio.routes';
app.use('/api/miservicio', miServicioRoutes);
```

## 🎮 Módulos Comunes

### Sistema de Votación

1. Crea tabla en la base de datos:

```sql
CREATE TABLE `votes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `account_id` INT NOT NULL,
  `vote_site` VARCHAR(50) NOT NULL,
  `vote_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `claimed` TINYINT DEFAULT 0,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`)
);
```

2. Implementa el servicio y rutas siguiendo el patrón del proyecto.

### Tienda de Donaciones

Similar al sistema de votación, crea:
- Tabla `shop_items` para los items
- Tabla `purchases` para las compras
- Servicio para procesar pagos
- Frontend para mostrar items

### Rankings

Ya hay base para rankings con `getTopCharacters`. Expándelo para:
- Rankings de PvP
- Rankings de Guild
- Rankings de logros

## 🔐 Seguridad

### Rate Limiting

Ajusta en `backend/src/index.ts`:

```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de requests
});
```

### CORS

Configura los orígenes permitidos en `backend/.env`:

```env
CORS_ORIGIN=https://tudominio.com,https://www.tudominio.com
```

## 📱 Responsive Design

El diseño usa Tailwind CSS con clases responsive:

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  {/* Se adapta automáticamente */}
</div>
```

## 🚀 Despliegue en Producción

### Backend

```bash
cd backend
npm run build
npm start
```

Usa PM2 para gestión de procesos:

```bash
npm install -g pm2
pm2 start dist/index.js --name trinity-api
```

### Frontend

```bash
cd frontend
npm run build
```

Sirve la carpeta `dist/` con Nginx o cualquier servidor web.

### Nginx Ejemplo

```nginx
server {
    listen 80;
    server_name tudominio.com;

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 💡 Tips

1. **Usa React Query**: Ya está configurado para caché automático de datos
2. **Animaciones**: Usa Framer Motion para transiciones suaves
3. **Toast Notifications**: Usa `toast.success()` y `toast.error()`
4. **TypeScript**: Define tipos para mejor autocompletado y menos errores
5. **Componentes reutilizables**: Crea componentes en `frontend/src/components/`

## 🐛 Debugging

### Backend Logs

```bash
cd backend
npm run dev
# Los logs aparecerán en consola
```

### Frontend Dev Tools

- React Developer Tools (extensión Chrome/Firefox)
- Redux DevTools para Zustand
- Network tab para ver requests

## 📚 Recursos Adicionales

- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [TrinityCore Documentation](https://trinitycore.info/)

¡Disfruta personalizando tu CMS!
