# Mini Tickets

Aplicación de gestión de tickets de seguridad con frontend React y backend FastAPI. El contrato HTTP está definido en `contract/openapirest.yml`.

Esta guía utiliza **Bash** (Linux, macOS, WSL o Git Bash). Ejecuta los comandos desde la raíz del repositorio, donde se encuentran `package.json` y `playwright.config.ts`.

## Requisitos

- Node.js y npm.
- Python 3.12.
- Bash.

## Instalación limpia en Windows con Git Bash

Ejecuta este bloque desde la raíz del repositorio. Está preparado para Windows usando **Git Bash** y Python **3.12**. Elimina el entorno virtual anterior y lo crea de nuevo con la versión indicada.

```bash
# 1. Limpiar entorno anterior
deactivate 2>/dev/null || true
rm -rf .venv

# 2. Comprobar versiones
node -v
npm -v
py -3.12 --version

# 3. Instalar dependencias frontend
npm ci

# 4. Crear entorno Python 3.12
py -3.12 -m venv .venv

# 5. Activar entorno
source .venv/Scripts/activate

# 6. Actualizar pip
python -m pip install --upgrade pip setuptools wheel

# 7. Instalar dependencias backend
python -m pip install -r backend/requirements.txt

# 8. Instalar Chromium
npx playwright install chromium

# 9. Verificar Python
python --version
python -m pip check

# 10. Ejecutar todos los tests
npm run test:all
```

El archivo `backend/requirements.txt` contiene las dependencias Python del backend y los tests. `package-lock.json` fija las dependencias JavaScript. El comando `npm ci` instala exactamente las versiones registradas en ese lockfile.

Para Git Bash en Windows, activa el entorno con `source .venv/Scripts/activate`. En Linux/macOS/WSL, la ruta habitual es `source .venv/bin/activate`; la creación del entorno debe hacerse con una instalación local de Python 3.12 (por ejemplo, `python3.12 -m venv .venv`).

## Arranque en desarrollo

Inicia backend y frontend en terminales Bash separadas. En ambas, sitúate en la raíz del proyecto y activa el entorno virtual con `source .venv/Scripts/activate`.

### 1. Backend

```bash
source .venv/Scripts/activate
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 3001 --reload
```

La API queda disponible en `http://127.0.0.1:3001`. El endpoint de comprobación es `GET /health`.

### 2. Frontend

En una segunda terminal:

```bash
source .venv/Scripts/activate
npm run dev -- --host 127.0.0.1
```

Vite sirve la aplicación en `http://127.0.0.1:5173`.

Durante el desarrollo, Vite reenvía las rutas `/api` al backend en `http://127.0.0.1:3001`. El frontend utiliza rutas relativas y no necesita conocer directamente el host del backend.

Para ejecutar las pruebas E2E no es necesario arrancar los servidores manualmente: `playwright.config.ts` los inicia y espera a que estén disponibles.

## Configuración multiplataforma de Playwright

El `playwright.config.ts` debe utilizar comandos compatibles con Bash y Windows. Si actualmente contiene rutas específicas de Windows como `.\\.venv\\Scripts\\python.exe` o `npm.cmd`, sustituye las entradas de `webServer` por estas:

```typescript
webServer: [
  {
    command: "python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 3001",
    url: "http://127.0.0.1:3001/health",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
],
```

Playwright hereda el `PATH` del proceso que lo ejecuta. Por eso, activa `.venv` antes de lanzar las pruebas: así `python` apunta al intérprete del entorno virtual.

## Tests

### Suite completa: `test:all`

Con las dependencias instaladas y el entorno virtual activado, ejecutar desde la raíz:

```bash
source .venv/Scripts/activate
npm run test:all
```

El script `test:all` definido en `package.json` ejecuta secuencialmente:

1. `test:react`: pruebas del frontend con Vitest.
2. `test:python`: pruebas del backend con pytest.
3. `test:e2e`: pruebas de integración de navegador con Playwright.

### Ejecución individual

```bash
# Frontend
npm run test:react

# Backend
python -m pytest backend/tests -v

# E2E
npx playwright test

# Una prueba E2E concreta
npx playwright test e2e/profile-update-ticket.spec.ts
```

### Comprobación del contrato y compilación

Estos comandos son comprobaciones adicionales; **no están incluidos en el script `test:all` actual**:

```bash
# Comparación del OpenAPI de FastAPI con el contrato versionado
npm run api:check

# Compilación TypeScript y build de Vite
npm run build

# Regenerar tipos TypeScript desde OpenAPI
npm run api:types
```

## Contrato API: cómo se comprueba

`contract/openapirest.yml` es la fuente de verdad del contrato HTTP.

### Backend

FastAPI expone el documento OpenAPI generado por la aplicación. `backend/check_contract.py`, ejecutado mediante `npm run api:check`, carga el YAML versionado y lo compara con el OpenAPI generado por FastAPI. Comprueba:

- servidores y requisito de seguridad global;
- rutas y operaciones HTTP;
- `operationId`;
- códigos de respuesta;
- parámetros de cada operación;
- propiedades del esquema `Ticket`;
- uso de `application/problem+json` en las respuestas de error que declara el contrato.

El script termina con error si detecta diferencias y muestra `CONTRACT CHECK PASSED` cuando las comprobaciones implementadas coinciden.

### Frontend

Los tipos TypeScript de `src/api/generated/schema.d.ts` se generan desde el YAML con `openapi-typescript` (`npm run api:types`). Los servicios HTTP utilizan esos tipos y esquemas Zod para validar las respuestas en el límite de entrada de la API. Así se combinan comprobación estática durante el desarrollo y validación en tiempo de ejecución.

`api:check` compara el contrato con el OpenAPI de FastAPI; no sustituye a los tests del frontend ni a las pruebas E2E.

## Decisiones técnicas relevantes

- **Arquitectura hexagonal en backend:** reglas de dominio, casos de uso, puertos y adaptadores están separados. FastAPI queda en el adaptador REST; la composición de dependencias se concentra en `backend/app/bootstrap.py`.
- **Persistencia en memoria:** el adaptador actual utiliza datos en memoria y un seed, adecuado para demostración y pruebas, pero no para conservar información entre reinicios.
- **Contrato primero:** el YAML OpenAPI documenta las operaciones y modelos compartidos por backend y frontend.
- **Tipos generados más Zod:** OpenAPI aporta los tipos estáticos; Zod valida respuestas recibidas en ejecución.
- **Proxy de Vite:** `/api` se reenvía al backend local, evitando acoplar los componentes a un host concreto.
- **Perfiles simulados:** Developer, Team lead y Security se representan mediante las cabeceras `X-User-Team` y `X-User-Permissions`. El selector permite probar permisos y visibilidad sin implementar un proveedor real de identidad.
- **Errores Problem Details:** los errores de API se expresan con `application/problem+json` y el frontend presenta mensajes diferenciados. Un ticket inexistente o no visible se trata como no encontrado.

## Qué mejoraría con más tiempo

- Sustituir el adaptador en memoria por persistencia real, con migraciones y transacciones.
- Incorporar autenticación y autorización reales; las cabeceras de perfil son una simulación para desarrollo y pruebas.
- Ampliar las pruebas de contrato para validar esquemas y ejemplos completos de todas las respuestas, no solo las propiedades principales comprobadas por el script actual.
- Añadir más pruebas E2E para filtros, ordenación, paginación, errores 403/409/422, estados vacíos y navegación al detalle.
- Añadir CI para instalar dependencias y ejecutar `test:all`, `api:check` y `build` en cada pull request.
- Añadir configuración de despliegue, observabilidad, logs estructurados y gestión de secretos para producción.

## Alcance y exclusiones conocidas

- No se implementa autenticación real ni gestión de usuarios: los perfiles son simulados mediante cabeceras.
- No hay base de datos persistente: los datos se cargan desde el seed y se pierden al reiniciar el proceso.
- No se incluye despliegue productivo ni pipeline CI/CD.
- El script `test:all` ejecuta Vitest, pytest y Playwright, pero no ejecuta `api:check` ni `build`; deben lanzarse aparte.
- La prueba E2E de tickets restringidos depende de que el seed contenga un ticket restringido de otro equipo; si no lo encuentra, Playwright marca ese caso como omitido (`skip`).

## Estructura principal

```text
backend/
  app/
    adapters/
      inbound/       # Adaptador REST FastAPI
      outbound/      # Adaptador de persistencia en memoria
    application/     # Casos de uso
    domain/          # Reglas de dominio
    ports/           # Interfaces de salida
    bootstrap.py     # Composición de dependencias
    seed.py          # Datos de demostración
  tests/
  check_contract.py
contract/
  openapirest.yml
src/
  api/generated/     # Tipos generados desde OpenAPI
  features/          # Servicios, esquemas y lógica de tickets
  components/
  pages/
e2e/                 # Pruebas Playwright
```