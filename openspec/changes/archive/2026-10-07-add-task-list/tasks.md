# Tasks

## 1. Backend: modelo de datos

- [x] 1.1 Crear la migración de `tasks` con `node ace make:migration tasks`. Columnas: `id`, `title` string(255) not null, `status` string not null con default `'pending'`, `assignee_id` int not null con FK a `users.id` y `onDelete('RESTRICT')`, `created_at` y `updated_at`. Sin columna de vencimiento. Verificar con `node ace migration:run`, que debe terminar sin errores, y comprobando que `database/schema.ts` contiene `TaskSchema` con esas columnas
- [x] 1.2 Crear `app/models/task.ts`, que extiende `TaskSchema`. Exporta `TASK_STATUSES = ['pending', 'in_progress', 'done'] as const` y declara la relación `belongsTo` `assignee` con `foreignKey: 'assigneeId'`. Verificar con `npm run typecheck`

## 2. Backend: API de tareas

- [x] 2.1 Crear `app/validators/task.ts` con `createTaskValidator` (`title`: trim, minLength 1, maxLength 255) y `updateTaskValidator` (`status` como `vine.enum(TASK_STATUSES).optional()` y `assigneeId` como `vine.number().exists({ table: 'users', column: 'id' }).optional()`). Cada uno de los dos campos es obligatorio cuando falta el otro (`requiredIfMissing`), así que un cuerpo sin ninguno da `422`. Antes, confirmar en los `.d.ts` de VineJS 4 y Lucid 22 las firmas de `requiredIfMissing` y `exists`. Verificar con `npm run typecheck`
- [x] 2.2 Crear `app/transformers/task_transformer.ts`, que devuelve solo `id`, `title`, `status` y `assignee: { id, fullName }`. Verificar con `npm run typecheck` y revisando que no expone ni `email` ni fechas
- [x] 2.3 Crear `app/controllers/tasks_controller.ts` con:
  - `index`: preload de `assignee`, sin `orderBy`;
  - `store`: `assigneeId` es el de la persona autenticada; responde `201` tras cargar `assignee`;
  - `update`: `findOrFail`, merge de los campos presentes, `save` y `load('assignee')`.

  Todas las respuestas pasan por `serialize(TaskTransformer...)`. Verificar con `npm run typecheck`
- [x] 2.4 Registrar en `start/routes.ts` un grupo `tasks` bajo `/api/v1` con `.use(middleware.auth())` y solo `GET /`, `POST /` y `PATCH /:id`, usando `controllers.Tasks`. Arrancar `npm run dev` para regenerar `.adonisjs/`. Verificar con `node ace list:routes`, que debe mostrar exactamente esas tres rutas de tareas, y con `npm run lint`
- [x] 2.5 Comprobar a mano con curl los escenarios de la spec de la API:
  - `401` sin token;
  - `201` al crear, con `status: "pending"` y como responsable quien crea;
  - `422` con título vacío, en blanco o de 256 caracteres, y `201` con 255;
  - `status` y `assigneeId` ignorados al crear;
  - `422` con `status: "blocked"` o `"Hecho"`;
  - `200` volviendo de `done` a `pending`;
  - `200` reasignando a otro usuario;
  - `422` con un `assigneeId` inexistente;
  - `422` en `PATCH` con `{}` y con `{ "title": "Otro" }`, sin que cambie el título;
  - `200` en `PATCH` con `status` y `title` a la vez, que cambia el estado y conserva el título;
  - `404` en `PATCH`, `GET /:id` y `DELETE /:id` sobre ids inexistentes;
  - dos usuarios distintos reciben la misma lista.

  Si la BD de desarrollo quedó con datos de prueba, limpiarla después con `node ace migration:fresh`

## 3. Frontend: cliente de API y tipos

- [x] 3.1 Añadir a `src/lib/types.ts` los tipos `TaskStatus` y `Task` (con `assignee: { id: number; fullName: string | null }`). Verificar con `npm run build`
- [x] 3.2 En `src/lib/api.ts`:
  - admitir `PATCH` en `request`;
  - añadir `listTasks`, `createTask` y `updateTask`;
  - añadir `title: 'el título'` a `FIELD_LABELS`;
  - traducir las reglas `enum` y `database.exists`;
  - poner en mayúscula la primera letra de los mensajes que empiezan por la etiqueta del campo (`minLength`, `maxLength`), de modo que salgan «El título no puede superar los 255 caracteres.» y «La contraseña debe tener al menos 8 caracteres.».

  Verificar con `npm run build` y `npm run lint`, y en el navegador que el registro con una contraseña corta muestra «La contraseña debe tener al menos 8 caracteres.»

## 4. Frontend: pantalla de la lista

- [x] 4.1 Crear `src/pages/tasks-page.tsx`:
  - carga de la lista con el token del contexto;
  - formulario con un único `Input` de título y un botón «Crear tarea», usando `useAuthForm(['title'])` y la comprobación local de título en blanco («Falta rellenar el título.»);
  - una fila por tarea con título, `fullName ?? 'Sin nombre'` y el estado;
  - estado vacío con la explicación y la invitación a crear la primera tarea;
  - enlace «Mi perfil».

  Sin fechas en ninguna parte. Verificar con `npm run build` y `npm run lint`
- [x] 4.2 Añadir el selector de estado por fila: un `<select>` nativo con «Pendiente», «En curso» y «Hecho», estilado como `Input`. Hace una actualización optimista y, si `updateTask` falla, revierte la fila y muestra un `Alert` destructivo. Verificar con `npm run build` y, en el navegador, cambiando un estado y comprobando que persiste tras recargar
- [x] 4.3 Tras crear una tarea, añadirla al estado local y vaciar el campo, sin volver a pedir la lista. Verificar en el navegador que la fila aparece sin recargar, con el nombre propio como responsable y en «Pendiente»
- [x] 4.4 Mostrar en un `Alert` el mensaje de la `ApiError` cuando crear o cambiar el estado falle con `401` («Tu sesión ha caducado. Vuelve a iniciar sesión.»), sin añadir fila y revirtiendo el estado. Verificar en el navegador revocando el token con `curl -X POST .../account/logout` usando el mismo token, e intentando después crear una tarea y cambiar un estado

## 5. Frontend: navegación

- [x] 5.1 En `src/routes/app-routes.tsx`, añadir `/tasks` bajo `ProtectedRoute` y cambiar el comodín a `/tasks`. En `src/routes/public-only-route.tsx`, redirigir a `/tasks`. Verificar con `npm run build` y, en el navegador, que tras iniciar sesión o registrarse se llega a `/tasks`, que `/cualquier-cosa` lleva a `/tasks` y que sin sesión `/tasks` lleva a `/login`
- [x] 5.2 Añadir en `src/pages/profile-page.tsx` un enlace «Ver tareas» a `/tasks`. Verificar en el navegador que se puede ir y volver entre perfil y lista

## 6. Comprobación integrada

- [x] 6.1 Recorrer en el navegador, con dos cuentas (una de ellas sin nombre), el flujo completo:
  - estado vacío;
  - crear tareas desde las dos cuentas;
  - las dos ven la misma lista;
  - la tarea de la cuenta sin nombre muestra «Sin nombre» y nunca un email ni un id;
  - cambiar el estado de una tarea ajena;
  - título en blanco y título demasiado largo rechazados junto al campo, este último con «El título no puede superar los 255 caracteres.»;
  - ninguna fecha visible.

  Pasar `npm run typecheck` y `npm run lint` en `backend/`, y `npm run build` y `npm run lint` en `frontend/`

## Workflow follow-up

- Archivar el change (`/opsx:archive`) cuando el PR se haya revisado con `adversarial-reviewer` y fusionado, para que `tasks` pase a ser una spec viva y el delta de `auth` se aplique.
