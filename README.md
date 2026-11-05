# Tickets React — Prueba técnica

Aplicación de tickets construida con React 18, TypeScript estricto, React Router 6, Zod, Vitest y Testing Library.

## Requisitos

- Node.js 20 o superior recomendado.
- npm.

## Comandos

```bash
npm install
npm run api:types
npm run api:check
npm run test:run
npm run dev
npm run build
npm run preview
```

El servidor Vite reenvía `/api` a `http://localhost:3001` (configurable en `vite.config.ts`). Si el backend no está disponible, la interfaz muestra un conjunto de datos mock.

## Contrato y tipos

`openapi-rest.yml` es el contrato OpenAPI 3.0.3. 
Los tipos TypeScript se generan en `src/api/generated/schema.d.ts` mediante `openapi-typescript`. 
Ejecuta `npm run api:types` después de modificar el contrato. 
`npm run api:check` regenera los tipos y comprueba que el archivo generado no tenga cambios pendientes respecto a Git (ejecútalo dentro de un repositorio Git).

Las respuestas HTTP se validan en runtime con Zod antes de usarse.

## Búsqueda y URL

La URL es la fuente de los filtros. `useTicketListParams` valida y normaliza sus valores, elimina defaults de la URL y conserva la navegación atrás/adelante. El debounce se aplica en `TicketsPage`, en el límite de interacción, para evitar una peticiónes repetidas constantemente al escribir en el campo de busqueda.

## Revisión de código

Consulta [PR_REVIEW.md](./PR_REVIEW.md) para la revisión razonada del componente original.
