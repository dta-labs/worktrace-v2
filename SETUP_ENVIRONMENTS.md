# Guía de Configuración de Entornos

## 🔐 Gestión de Secrets

Este proyecto ha migrado a un sistema basado en **variables de entorno** para manejar la configuración de Firebase de forma segura.

## Para Nuevos Miembros del Equipo

### Paso 1: Obtener las credenciales

Las credenciales de Firebase se comparten a través de canales seguros:
- **Password Manager**: Busca el proyecto "WorkTrace" en 1Password/Bitwarden
- **Contacto**: Pide al lead del proyecto que te comparta las credenciales por Signal/WhatsApp

### Paso 2: Configurar tu entorno local

```bash
# En la raíz del proyecto
cp .env.example .env.local

# Edita .env.local con tus credenciales
# (usa VS Code, nano, o tu editor preferido)
```

### Paso 3: Configurar Firebase Functions

```bash
# En la carpeta functions/
cd functions
cp .env.example .env

# El archivo .env ya tiene valores por defecto para desarrollo
# Solo necesitas editarlo si usas un proyecto diferente
```

### Paso 4: Verificar configuración

```bash
# Ejecutar la aplicación Angular
npm start

# En otra terminal, ejecutar funciones (si es necesario)
cd functions
npm run serve
```

## Archivos Importantes

| Archivo | Propósito | ¿Commit? |
|---------|-----------|----------|
| `.env.example` | Plantilla con nombres de variables | ✅ Sí |
| `.env.local` | Tus credenciales locales | ❌ No |
| `functions/.env.example` | Plantilla para functions | ✅ Sí |
| `functions/.env` | Configuración local de functions | ❌ No |
| `src/environments/*.ts` | Archivos de environment (sin secrets) | ✅ Sí |

## Flujo de Trabajo

```
┌─────────────────────────────────────────────────────┐
│  REPOSITORIO (Git)                                  │
│  - .env.example (plantilla pública)                 │
│  - src/environments/*.ts (sin secrets)              │
│  - functions/.env.example (plantilla pública)       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  TU MÁQUINA LOCAL                                   │
│  - Copias .env.example → .env.local                 │
│  - Editas .env.local con tus credenciales           │
│  - .env.local está en .gitignore (nunca se commitea)│
└─────────────────────────────────────────────────────┘
```

## Solución de Problemas

### Error: "Firebase not initialized"
- Verifica que `.env.local` existe en la raíz del proyecto
- Confirma que todas las variables tienen valores válidos
- Reinicia el servidor de desarrollo (`npm start`)

### Error: "GCLOUD_PROJECT not defined"
- Verifica que `functions/.env` existe
- Confirma que `GCLOUD_PROJECT` tiene el valor correcto

### ¿Necesitas múltiples entornos?
Crea archivos específicos:
```bash
.env.local          # Desarrollo local
.env.staging.local  # Staging
.env.prod.local     # Producción local
```

## Seguridad

- ✅ Las credenciales están protegidas por Application Check de Firebase
- ✅ Los archivos `.env.*` están en `.gitignore`
- ✅ Solo los miembros autorizados tienen acceso a las credenciales
- 🔄 Rotar credenciales periódicamente (recomendado cada 90 días)

## Contacto

¿Problemas? Contacta al equipo de desarrollo en el canal #worktrace-dev
