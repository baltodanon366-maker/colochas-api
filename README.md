# 🎰 Sistema de Control de Rifas - Colochas API

API REST completa para el control de inventario de rifas diarias con múltiples turnos, sistema multiusuario y control de ventas.

## 📋 Descripción del Proyecto

Sistema completo para gestionar:
- **Turnos configurables** (ej: "TURNO 6PM", "TARDE 3PM", "NOCHE 9PM")
- **Ventas de números** (00-99) con múltiples números por venta
- **Control de restricciones** manuales de números por turno (completas o con límite de monto)
- **Cierre de turnos** con consolidación de ventas
- **Sistema de alertas** para cierre de turno y restricciones
- **KPIs y reportes** para administradores
- **Sistema multiusuario** con roles y permisos (Admin/Vendedor)
- **Historial de ventas** con filtros avanzados
- **Análisis de números** vendidos con estadísticas detalladas
- **Reporte de cierre** por turno con totales por número

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** (v18+ o v20+)
- **NestJS** (Framework principal)
- **TypeScript** (Lenguaje)
- **PostgreSQL** (Base de datos)
- **Prisma** (ORM)
- **JWT** (Autenticación)
- **bcrypt** (Hash de contraseñas)
- **class-validator** y **class-transformer** (Validaciones)
- **Swagger/OpenAPI** (Documentación de API)

## 🚀 Instalación Local

### Prerrequisitos

- Node.js 18+ o 20+
- PostgreSQL 14+ (local) o cuenta en Neon (producción)
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd Colochas_Api

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales de PostgreSQL

# Configurar base de datos
npm run db:generate
npm run db:migrate

# Ejecutar en desarrollo
npm run start:dev
```

La API estará disponible en `http://localhost:3000`

## 📖 Documentación de API

Una vez ejecutando el proyecto, accede a:
- **Swagger UI:** `http://localhost:3000/api`

## 🔒 Variables de Entorno

Crea un archivo `.env` basado en `env.example`:

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/colochas_db?schema=public"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# App
PORT=3000
NODE_ENV=development

# CORS (para producción, usar URL específica de tu app móvil)
CORS_ORIGIN="*"

# Bcrypt
BCRYPT_ROUNDS=10
```

## 🚀 Despliegue en Producción

### Opción 1: Render (Recomendado)

1. **Crear cuenta en Render:**
   - Visita [render.com](https://render.com)
   - Crea una cuenta gratuita

2. **Crear nuevo Web Service:**
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub/GitLab
   - Selecciona el repositorio `Colochas_Api`

3. **Configurar el servicio:**
   - **Name:** `colochas-api` (o el nombre que prefieras)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`

4. **Configurar variables de entorno:**
   - En la sección "Environment Variables", agrega todas las variables del `.env`:
     - `DATABASE_URL` (de Neon, ver sección siguiente)
     - `JWT_SECRET` (genera uno seguro)
     - `JWT_EXPIRES_IN`
     - `JWT_REFRESH_SECRET`
     - `JWT_REFRESH_EXPIRES_IN`
     - `PORT` (Render lo asigna automáticamente, pero puedes usar `3000`)
     - `NODE_ENV=production`
     - `CORS_ORIGIN` (URL de tu app móvil o `*` para desarrollo)
     - `BCRYPT_ROUNDS=10`

5. **Desplegar:**
   - Click en "Create Web Service"
   - Render construirá y desplegará automáticamente
   - Obtendrás una URL como: `https://colochas-api.onrender.com`

### Opción 2: Otra plataforma (Vercel, Railway, etc.)

Sigue los mismos pasos pero adapta los comandos según la plataforma.

## 🗄️ Migración de Base de Datos a Neon

### Paso 1: Crear cuenta en Neon

1. Visita [neon.tech](https://neon.tech)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto

### Paso 2: Obtener Connection String

1. En el dashboard de Neon, ve a tu proyecto
2. Click en "Connection Details"
3. Copia el connection string (formato: `postgresql://user:password@host/dbname`)

### Paso 3: Exportar Schema Local

```bash
# Desde tu PostgreSQL local, exportar schema
pg_dump -h localhost -U postgres -d colochas_db --schema-only > schema.sql

# O usar Prisma para generar el schema
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema.sql
```

### Paso 4: Importar Schema a Neon

1. En Neon, ve a "SQL Editor"
2. Ejecuta el archivo `database/stored_procedures.sql` completo
3. Ejecuta las migraciones de Prisma:

```bash
# Actualizar DATABASE_URL en .env con la URL de Neon
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate
```

### Paso 5: Migrar Datos (Opcional)

Si tienes datos en tu base local que quieres migrar:

```bash
# Exportar datos
pg_dump -h localhost -U postgres -d colochas_db --data-only > data.sql

# Importar a Neon (usando el SQL Editor de Neon o psql)
psql "postgresql://user:password@host.neon.tech/dbname?sslmode=require" < data.sql
```

### Paso 6: Actualizar Variables de Entorno

Actualiza `DATABASE_URL` en:
- Render (variables de entorno del servicio)
- Tu `.env` local (si quieres conectarte a Neon desde local)

## 📊 Endpoints Principales

### Autenticación
- `POST /api/v1/auth/signUp` - Registro de usuario
- `POST /api/v1/auth/login` - Iniciar sesión
- `GET /api/v1/auth` - Listar usuarios (solo admin)

### Ventas
- `POST /api/v1/ventas` - Crear venta
- `GET /api/v1/ventas` - Listar ventas
- `GET /api/v1/ventas/:id` - Obtener venta por ID

### Historial
- `GET /api/v1/historial/ventas` - Historial de ventas
- `GET /api/v1/historial/analisis-numeros` - Análisis de números
- `GET /api/v1/historial/reporte-cierre` - Reporte de cierre por turno

### Turnos
- `GET /api/v1/turnos` - Listar turnos
- `GET /api/v1/turnos/activos` - Turnos activos

### Restricciones
- `POST /api/v1/restricciones` - Crear restricción
- `GET /api/v1/restricciones` - Listar restricciones
- `DELETE /api/v1/restricciones/:id` - Eliminar restricción

### Usuarios (Solo Admin)
- `GET /api/v1/users` - Listar usuarios
- `POST /api/v1/users` - Crear usuario
- `PUT /api/v1/users/:id` - Actualizar usuario
- `POST /api/v1/users/:id/activate` - Activar usuario
- `POST /api/v1/users/:id/deactivate` - Desactivar usuario
- `POST /api/v1/users/:id/roles/:roleId` - Asignar rol
- `DELETE /api/v1/users/:id/roles/:roleId` - Remover rol

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev          # Ejecutar en modo desarrollo
npm run start:prod         # Ejecutar en producción
npm run build              # Compilar para producción

# Base de datos
npm run db:migrate         # Ejecutar migraciones
npm run db:generate        # Generar cliente Prisma
npm run db:studio          # Abrir Prisma Studio
npm run db:seed            # Ejecutar seeders
npm run db:reset           # Resetear base de datos

# Linting
npm run lint               # Ejecutar ESLint
npm run format             # Formatear código
```

## 🔐 Seguridad

- **JWT Tokens**: Expiración configurable (default: 15 minutos)
- **bcrypt**: Hash de contraseñas con 10 rounds
- **Guards**: `JwtAuthGuard` y `RolesGuard` para protección de rutas
- **CORS**: Configurado para permitir solo orígenes autorizados
- **Validación**: Todas las entradas validadas con `class-validator`

## ⚠️ Notas Importantes para Producción

1. **JWT Secret**: Cambia `JWT_SECRET` por una clave segura y única
2. **CORS**: Configura `CORS_ORIGIN` con la URL específica de tu app móvil
3. **Base de Datos**: Usa SSL en producción (`?sslmode=require` en DATABASE_URL)
4. **Variables de Entorno**: Nunca commitees el archivo `.env`
5. **Logs**: Los logs de debug han sido removidos, solo se mantienen errores críticos
6. **Stored Procedures**: El sistema utiliza funciones almacenadas de PostgreSQL

## 🐛 Troubleshooting

### Error de conexión a base de datos
- Verifica que `DATABASE_URL` esté correctamente configurado
- Asegúrate de que la base de datos esté accesible desde Render
- Verifica que el SSL esté habilitado (`sslmode=require`)

### Error 500 en producción
- Revisa los logs en Render
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que las migraciones se hayan ejecutado correctamente

### CORS errors
- Verifica que `CORS_ORIGIN` incluya la URL correcta de tu app móvil
- En desarrollo, puedes usar `*` temporalmente

## 📄 Licencia

Este proyecto es privado y está destinado únicamente para uso interno.

---

**Desarrollado con ❤️ usando NestJS**

**Última actualización:** 2025
