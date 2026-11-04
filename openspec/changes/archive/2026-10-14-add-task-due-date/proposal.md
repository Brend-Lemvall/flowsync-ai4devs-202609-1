# Proposal

## Why

Hoy una tarea no tiene plazo, así que nadie puede comprometerse con una fecha ni enterarse a tiempo de que se le ha pasado (RF-13, RF-14 y RF-15 del PRD; historia FS-118). La lista compartida ya existe, y la fecha es lo siguiente que la épica de gestión de tareas necesita.

## What Changes

**Alcance.** Entra la historia FS-118, sin su ticket de tests (FS-118.5) ni las pruebas que piden los demás.

**Backend.**

- **Fecha de vencimiento.** Cada tarea gana una fecha opcional, de calendario y sin hora, que viaja como `dueDate` en formato `YYYY-MM-DD`, o `null` si no tiene.
  - Al crear se puede indicar, pero por defecto la tarea nace sin fecha.
  - Al actualizar se puede poner, cambiar o quitar. Para quitarla se envía `"dueDate": null` de forma explícita.
  - Se acepta una fecha anterior a hoy: la tarea nace o queda vencida, y no se rechaza.
  - Una fecha imposible o mal formada se rechaza con `422` señalando el campo.
- **Regla de vencimiento.** La API calcula en cada lectura un booleano `isOverdue` y lo incluye en la representación de toda tarea. Es `true` solo si se cumplen las tres condiciones a la vez: la tarea tiene fecha, esa fecha es anterior a hoy y su estado no es `done`.
  - Una tarea con fecha de hoy todavía no está vencida.
  - `isOverdue` no se guarda en ninguna columna y no hay procesos programados. Si el cliente lo envía, se ignora.
- **Día de referencia.** «Hoy» es el día de quien mira, que llega en la cabecera `X-Client-Date: YYYY-MM-DD`. Si falta, se usa el día UTC del servidor; si viene mal formada, `422`.
- **Lectura individual.** `GET /api/v1/tasks/:id`, la superficie mínima que necesita «abrir la tarea». El borrado sigue sin existir.

**Frontend.**

- **Abrir una tarea.** El título de cada fila pasa a ser un botón que abre, bajo la fila, un panel con:
  - un campo de fecha que se guarda solo al cambiarlo;
  - un botón «Quitar fecha» que no pide confirmación;
  - la señal «Vencida», con texto e icono, cuando la tarea lo está;
  - el selector de estado.

  El panel carga la tarea con la lectura individual.
- **Fecha inválida.** Una fecha incompleta o imposible deja la anterior intacta y explica el problema junto al campo.
- **Lista y creación sin cambios visibles.** Las filas cerradas siguen mostrando solo título, responsable y estado, sin fecha ni marca de vencida. El formulario de creación sigue pidiendo solo el título.
- **Día del navegador.** Todas las peticiones de tareas mandan `X-Client-Date` con el día local.

**Fuera de alcance:**

- notificaciones, recordatorios y recurrencia;
- ordenar o filtrar por fecha;
- la pantalla de detalle completa;
- borrar tareas;
- tests de cualquier tipo.

**Puntos abiertos:**

- **Lectura individual (PA-6).** Este change añade la lectura individual sin una pantalla de detalle completa. Cuando esa pantalla exista, el panel desplegable debería migrar a ella o quedar como atajo.
- **Volver atrás desde «Hecho» (PA-7).** Como `isOverdue` se calcula al leer, una tarea con fecha pasada que vuelve de `done` a otro estado vuelve a estar vencida. Es la consecuencia directa de la regla, pero PA-7 sigue sin decidir si ese camino de vuelta basta.
- **Ediciones simultáneas (PA-8).** Si dos personas cambian a la vez la fecha de la misma tarea, gana la última.
- **Sin cabecera, día UTC.** Un cliente que no manda `X-Client-Date` recibe el veredicto según el día UTC, que cerca de medianoche puede no coincidir con su día.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tasks`: la tarea gana `dueDate` e `isOverdue`. Se añade la lectura individual. Crear acepta una fecha opcional y actualizar admite poner, cambiar y quitar la fecha. En la interfaz, el título de una fila abre un panel con la fecha, la señal de vencida y el estado.

## Impact

- **Backend:**
  - una migración que añade la columna nullable `due_date` a `tasks`;
  - el modelo calcula el vencimiento a partir de un día de referencia;
  - el validador de creación acepta la fecha;
  - el de actualización admite `dueDate` y sustituye `requiredIfMissing` por una regla que distingue `null` de ausente;
  - el transformer expone `dueDate` e `isOverdue`;
  - el controlador gana `show` y resuelve el día de referencia en cada operación;
  - una ruta nueva, `GET /api/v1/tasks/:id`;
  - se regeneran `database/schema.ts` y `.adonisjs/`.
- **Frontend:**
  - tipos de `Task` ampliados;
  - `lib/api.ts` manda `X-Client-Date` y gana `getTask`, con `updateTask` aceptando `dueDate`;
  - traducción de los errores de fecha;
  - en `tasks-page.tsx`, el panel desplegable de cada fila.
- **Dependencias:** ninguna nueva. El campo de fecha es un `<input type="date">` nativo.
- **Datos:** las tareas existentes quedan sin fecha y no están vencidas.
