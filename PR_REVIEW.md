# Revisión de PR — TicketsPage original

Los hallazgos están ordenados por impacto para el usuario y riesgo de mantenimiento.

## Errores

1. **El endpoint no coincide con el acuerdo preliminario de backend.** La implementación original llama a `/api/v1/teams/{teamId}/tickets` e introduce incluso un espacio después de `?`; el endpoint establecido es `/api/v1/tickets`. La petición puede fallar o llegar a una ruta inexistente.
2. **No se gestionan los errores HTTP ni de red.** La implementación original procesa cualquier respuesta como JSON exitoso. Un 401, 403, 422 o 500 puede terminar mostrando una pantalla vacía o datos inconsistentes. Además, si `fetch` rechaza, `setLoading(false)` nunca se ejecuta y el spinner queda activo. Comprobar `response.ok`, manejar errores y cerrar la carga en `finally`.
3. **La URL puede producir parámetros inválidos.** `parseInt` puede devolver `NaN`; además, no se validan límites. Validar y normalizar todos los parámetros antes de llamar al backend.
4. **La búsqueda dispara una petición por pulsación y no se comparte por URL.** El estado local se usa directamente en el useEffect.
5. **No se codifican los parámetros de consulta.** Interpolar texto directamente puede romper la URL con espacios, `&` o caracteres especiales. Usar `URLSearchParams`.
6. **Se usa `any[]` para los tickets.** Se pierde la validacion del Tipo y se pueden cometer errores al acceder a propiedades inexistentes.
7. **La paginación y los filtros no están completos.** El ejemplo fija `limit`, no envía `severity`, `sort` ni `direction`, y no valida la página actual. Centralizar la lectura/escritura de filtros en un util.
8. **Se usa el índice del iterador como `key`.** En un futuro si el componente crece y se reutiliza el mismo key del .map, puede provocar renders incorrectas. Usar `ticket.id` u concatenacion.
9. **El `onChange` no actualiza nada.** `setTickets([...tickets])` solo crea una copia del array eliminando duplicados y no modifica ningún dato. Eliminarlo si no hay edición.
10. **No hay estados vacíos ni feedback accesible de carga/error.** El usuario no distingue entre cero resultados y un fallo. Añadir mensajes/alert

## mejoras UX/HTML
 **Faltan etiquetas accesibles para el buscador y los selectores.** Asociar cada control con un `label` mediante `htmlFor`/`id`.
 **La lógica de API, URL y presentación está concentrada en el componente.** Extraer servicio y hook hace la página más fácil de probar y mantener.

