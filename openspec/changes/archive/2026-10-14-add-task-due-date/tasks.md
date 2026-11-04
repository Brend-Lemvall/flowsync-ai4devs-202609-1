# Tasks

## 1. Backend: persistencia y regla

- [x] 1.1 Crear con `node ace make:migration` una migración que añada `due_date` (`table.date`, nullable, sin default) a `tasks`, con un `down` que la elimine. Verificar:
  - `node ace migration:run` termina sin errores sobre una BD con tareas, y las tareas previas siguen listándose;
  - `database/schema.ts` contiene `dueDate` como `@column.date()`;
  - `node ace migration:rollback` seguido de `migration:run` deja el esquema igual.
- [x] 1.2 Añadir a `app/models/task.ts` el método `isOverdueOn(today: string)`, que devuelve `true` solo si hay fecha, su `toISODate()` es `< today` y el estado no es `done`. Verificar con `npm run typecheck` y, en `node ace repl`, con los bordes día anterior, mismo día, día posterior, sin fecha y `done` con fecha pasada

## 2. Backend: API

- [x] 2.1 Leer los `.d.ts` de `@adonisjs/http-transformers` y decidir cómo llega el día de referencia al transformer: argumento extra de `transform` (Opción A del design) o dato en el modelo (Opción B). Ampliar `TaskTransformer` con `dueDate` (`toISODate()` o `null`) e `isOverdue` (`isOverdueOn(today)`). Verificar con `npm run typecheck`
- [x] 2.2 Crear el helper `resolveReferenceDay(request)`, que valida con VineJS la cabecera `X-Client-Date` (`YYYY-MM-DD`; si falta, día UTC; si es inválida, `422` con `field: "x-client-date"`). Verificar con `npm run typecheck`
- [x] 2.3 En `app/validators/task.ts`:
  - crear acepta `dueDate` opcional (`vine.date({ formats: ['YYYY-MM-DD'] })`);
  - actualizar acepta `dueDate` nullable y opcional;
  - los `requiredIfMissing` se sustituyen por una regla de objeto «al menos una de `status`, `assigneeId` o `dueDate` presente», que cuenta `null` como presente.

  Confirmar antes en los `.d.ts` de VineJS la firma de `vine.createRule` y el uso de `vine.object(...).use(...)` con `vine.create`. Verificar con `npm run typecheck`
- [x] 2.4 En `TasksController`:
  - añadir `show` (preload de `assignee`, `firstOrFail`);
  - resolver el día de referencia en `index`, `show`, `store` y `update` (en `update`, antes de guardar);
  - asignar `dueDate` en `store` y en `update` (`null` quita, `undefined` no toca);
  - pasar el día al transformer.

  Registrar `GET /api/v1/tasks/:id` en el grupo `tasks` y arrancar `npm run dev` para regenerar `.adonisjs/`. Verificar con `node ace list:routes` (cuatro rutas de tareas), `npm run typecheck` y `npm run lint`
- [x] 2.5 Comprobar a mano con curl los escenarios de API de la spec, con usuarios de prueba propios:
  - `GET /:id` da `200` con la tarea, `404` si no existe y `401` sin token; `DELETE` sigue dando `404`;
  - forma de la tarea, con `dueDate` e `isOverdue`;
  - `"2026-10-20"` se guarda y vuelve como `"2026-10-20"`;
  - crear sin fecha da `dueDate: null`, y crear con fecha pasada da `isOverdue: true`;
  - `422` con `2026-02-30`, con `30/10/2026` y con fecha y hora, conservando la fecha anterior;
  - `{ "dueDate": null }` solo da `200` y quita la fecha;
  - `{}`, `{ "title": ... }` e `{ "isOverdue": true }` solos dan `422`;
  - `isOverdue` enviado junto a `status` se ignora;
  - bordes de la regla con `X-Client-Date`: ayer, hoy y mañana, sin fecha y `done` con fecha pasada;
  - pasar a `done` conserva la fecha, y volver a `pending` vuelve a vencer;
  - aplazar quita el vencimiento;
  - reasignar no toca ni la fecha ni el vencimiento;
  - la misma tarea con `X-Client-Date` de dos días distintos da dos veredictos;
  - sin cabecera se usa el día UTC, y `X-Client-Date: mañana` da `422` sin aplicar el cambio;
  - siguen pasando los casos de `add-task-list` sobre estado, responsable y título.

  Después, borrar solo los datos de prueba creados

## 3. Frontend: cliente de API y tipos

- [x] 3.1 En `src/lib/types.ts`, añadir `dueDate: string | null` e `isOverdue: boolean` a `Task`, y `dueDate?: string | null` a `UpdateTaskPayload`. Verificar con `npm run build`
- [x] 3.2 En `src/lib/api.ts`:
  - mandar en todas las peticiones `X-Client-Date` con el día local (`getFullYear`/`getMonth`/`getDate`, no `toISOString`);
  - añadir `getTask(token, id)`;
  - traducir las reglas `date` y `date.format` a «Introduce una fecha completa y válida.» y añadir la etiqueta de `dueDate`.

  Verificar con `npm run build`, `npm run lint` y, en las DevTools del navegador, que las peticiones de tareas llevan la cabecera con el día local

## 4. Frontend: abrir la tarea

- [x] 4.1 En `src/pages/tasks-page.tsx`:
  - extraer el selector de estado a un componente local `StatusSelect`;
  - convertir el título de cada fila en un `<button>` con `aria-expanded` y `aria-controls` que abre y cierra el panel de esa fila (solo uno abierto a la vez);
  - al abrir, cargar la tarea con `getTask` y sustituirla en el estado local.

  Las filas cerradas siguen sin mostrar fecha ni marca. Verificar con `npm run build`, `npm run lint` y, en el navegador, que el panel se abre y se cierra con el ratón y con Tab e Intro, y que la lista cerrada no enseña fechas
- [x] 4.2 En el panel, añadir el campo «Fecha de vencimiento» (`Input type="date"`, controlado), que guarda al elegir un día sin actualización optimista y se deshabilita mientras dura la petición. Una fecha a medio escribir o un `422` muestran «Introduce una fecha completa y válida.» con `FieldError` y conservan la fecha anterior. Verificar en el navegador que:
  - poner y cambiar la fecha se ve al instante y persiste al cerrar y reabrir;
  - una fecha incompleta muestra el mensaje y no cambia nada.
- [x] 4.3 En el panel, añadir el botón «Quitar fecha» (`Button variant="outline"`, deshabilitado sin fecha), que envía `dueDate: null` sin confirmación. Verificar en el navegador que la fecha desaparece al momento y que no aparece ningún diálogo
- [x] 4.4 En el panel, añadir la señal «Vencida» (`role="status"`, icono y texto, no solo color), visible solo si `task.isOverdue` y sin cálculos en el cliente, y el `StatusSelect` compartido con la fila. Verificar en el navegador que:
  - una fecha de ayer muestra «Vencida» y una de hoy no;
  - pasar a «Hecho» desde el panel la quita, conserva la fecha y actualiza la fila;
  - una tarea sin fecha no muestra ningún aviso;
  - con la sesión revocada, cambiar la fecha muestra «Tu sesión ha caducado. Vuelve a iniciar sesión.» y conserva la fecha.

## 5. Comprobación integrada

- [x] 5.1 Recorrer en el navegador, con dos cuentas, el flujo completo:
  - crear una tarea sin que se ofrezca fecha;
  - abrirla, ponerle una fecha pasada y ver «Vencida»;
  - comprobar que la lista cerrada no muestra ni fecha ni marca;
  - desde la otra cuenta, abrir la misma tarea y ver la misma fecha y la señal;
  - aplazarla y que la señal desaparezca;
  - pasarla a «Hecho» y volverla a «Pendiente» con fecha pasada;
  - quitar la fecha.

  Pasar `npm run typecheck` y `npm run lint` en `backend/`, y `npm run build` y `npm run lint` en `frontend/`

## Workflow follow-up

- Cerrar según CLAUDE.md (`/commit`, PR, `adversarial-reviewer`) y archivar el change con `/opsx:archive` cuando esté fusionado.
