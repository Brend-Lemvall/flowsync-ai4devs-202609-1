# Design

## Context

El backend solo tiene el vertical de auth:

- tokens opacos con la guarda `api`;
- todas las respuestas pasan por `serialize()` con transformers;
- validación con VineJS 4 mediante `vine.create`;
- un esquema generado desde las migraciones;
- controladores referenciados desde el registro generado `#generated/controllers`.

El frontend concentra todas las llamadas a la API en `lib/api.ts`, que traduce los errores a `ApiError` en castellano. Protege las rutas con `ProtectedRoute` y `PublicOnlyRoute`, y sus pantallas usan `Card`, `Input`, `Button`, `Label` y `Alert` de `components/ui/`. No hay componente de selección ni runner de tests. La motivación está en proposal.md y el comportamiento en `specs/tasks` y `specs/auth`.

## Goals / Non-Goals

**Goals:**

- Seguir al pie de la letra las convenciones existentes: esquema generado, transformers, `serialize()`, imports por subpath y `lib/api.ts` como único punto de contacto con la API.
- Que no se pueda filtrar ningún dato de cuenta del responsable a la lista.

**Non-Goals:**

- Paginación: RNF-5 habla de unas 200 tareas, que caben en una sola respuesta.
- Ordenación (PA-3).
- Refresco en vivo (E3-2).
- Componente de selección de shadcn.
- Base de pruebas.
- Mostrar la reasignación en la interfaz.

## Decisions

### Modelo de datos

La tabla `tasks` tiene estas columnas:

- `id`;
- `title`: `string(255)`, no nulo;
- `status`: `string`, no nulo, por defecto `'pending'`;
- `assignee_id`: entero no nulo con FK a `users.id` y `onDelete('RESTRICT')`;
- `created_at` y `updated_at`.

Decisiones sobre el modelo:

- **Sin columna de fecha de vencimiento.** Es la restricción 1.
- **Sin `creator_id`.** Ningún requisito lo necesita, y crearlo «por si acaso» sería empezar a preparar historias futuras.
- **`RESTRICT` en la FK.** No existe borrado de usuarios. `CASCADE` borraría trabajo del equipo sin avisar si algún día se añade, y `RESTRICT` obliga a decidirlo entonces.
- **Estado como `string`, no como `enum` de la base de datos.** El conjunto cerrado se impone con `vine.enum` en la API. SQLite no tiene enums nativos, y Knex los emularía con un CHECK que complica las migraciones futuras. A cambio, la columna podría guardar otro valor si alguien escribe directamente en la BD; se acepta porque la única vía de escritura es la API.

`TASK_STATUSES = ['pending', 'in_progress', 'done'] as const` vive en el modelo y es la única fuente de los valores. El modelo `Task` extiende el `TaskSchema` generado y declara `belongsTo(() => User, { foreignKey: 'assigneeId' })` como `assignee`.

### Transformer con `pick` anidado explícito

`TaskTransformer.toObject()` devuelve `id`, `title`, `status` y `assignee`, este último construido a mano como `{ id, fullName }`. Se descartó reutilizar `UserTransformer`, que expone `email`, `initials` y las fechas, justo lo que la nota de E3-1 y el requisito «Representación de una tarea» prohíben. Los listados se responden con `serialize(TaskTransformer.transform(tasks))` sobre la colección. Si la firma de `transform` no acepta arrays en esta versión de `BaseTransformer`, hay que comprobarlo en el `.d.ts` y usar el helper de colección que exponga.

### Rutas y controlador

`TasksController` tiene `index`, `store` y `update` y va dentro de un grupo `/api/v1/tasks` con `.use(middleware.auth())`:

- `router.get('/')`;
- `router.post('/')`;
- `router.patch('/:id')`.

No se usa `router.resource`, que generaría `show` y `destroy`; la restricción 2 los excluye y así su ausencia es explícita.

- **`index`:** `Task.query().preload('assignee')`, sin `orderBy`.
- **`store`:** valida, ejecuta `Task.create({ title, assigneeId: auth.user.id })`, que deja el estado por defecto, hace `load('assignee')` y responde `201`.
- **`update`:** `Task.findOrFail(params.id)`, que da `404`, luego `merge` de los campos presentes, `save`, `load('assignee')` y responde `200`.

### Validadores

```ts
const title = () => vine.string().trim().minLength(1).maxLength(255)
createTaskValidator = vine.create({ title: title() })
updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional().requiredIfMissing('assigneeId'),
  assigneeId: vine.number().exists({ table: 'users', column: 'id' }).optional().requiredIfMissing('status'),
})
```

Detalles:

- **Título en blanco.** `trim()` va antes de `minLength(1)`, para que un título de solo espacios dé `422` en `title`.
- **Claves sobrantes.** VineJS descarta las claves no declaradas, así que `status` y `assigneeId` en el cuerpo de creación se ignoran solos, que es lo que pide el requisito «Crear una tarea con solo el título».
- **API de `exists`.** Hay que comprobar contra los `.d.ts` de Lucid 22 que la firma de `exists` es la misma que la de `unique({ table, column })`.
- **Al menos un campo en `PATCH`.** `requiredIfMissing` cruzado hace que un cuerpo sin `status` ni `assigneeId` (`{}` o solo `title`) dé `422`, en vez de un `200` que no cambia nada. Se prefiere a una comprobación a mano en el controlador porque mantiene la forma estándar de los errores de VineJS. Hay que confirmar su firma en los `.d.ts` de VineJS 4.

### Frontend: API y tipos

Tipos nuevos en `lib/types.ts`:

```ts
type TaskStatus = 'pending' | 'in_progress' | 'done'
type Task = { id; title; status: TaskStatus; assignee: { id; fullName: string | null } }
```

Funciones nuevas en `lib/api.ts`: `listTasks(token)`, `createTask(token, { title })` y `updateTask(token, id, { status })`. `request` admite el método `PATCH`.

Traducciones:

- `FIELD_LABELS` incorpora `title: 'el título'`.
- `translate` ya cubre `minLength`, `maxLength` y `required`. El mensaje de `maxLength` sale como «el título no puede superar los 255 caracteres.».
- Se añade `enum` con «Ese estado no existe.» y `database.exists` con «Esa persona no existe.».
- Los mensajes de `minLength` y `maxLength` se escriben con la primera letra en mayúscula («El título no puede superar los 255 caracteres.»). Esto cambia también el mensaje de contraseña corta del registro, que queda recogido en el delta de `auth`.

Los nombres en castellano de los estados viven en un único mapa, `STATUS_LABELS`, junto a la página.

### Frontend: pantalla

`pages/tasks-page.tsx` sigue la estructura de `profile-page.tsx`. Es una `Card` con:

- una cabecera con el título y un enlace «Mi perfil»;
- un formulario con `Input` y `Button` «Crear tarea»;
- la lista en un `<ul>`;
- un estado vacío.

Detalles de comportamiento:

- **Carga inicial.** Se hace con `useEffect` y el token del contexto, y muestra `FullScreenLoader` o un indicador inline mientras llega la respuesta.
- **Errores al crear.** Se reutiliza `useAuthForm(['title'])`, que pese al nombre es un gestor genérico de envío y errores por campo. No se renombra en este change para no tocar auth.
- **Título en blanco.** Se detecta en el cliente antes de enviar, con `failWith('title', 'Falta rellenar el título.')`, igual que el registro comprueba las contraseñas. Así se evita el mensaje poco natural de `minLength` («debe tener al menos 1 caracteres»). El backend lo sigue rechazando igualmente.
- **Tras crear.** La tarea devuelta se añade al final del estado local y se vacía el campo. No se vuelve a pedir la lista.
- **Selector de estado.** Es un `<select>` nativo con las mismas clases de borde y foco que `Input`, porque no hay `Select` en `components/ui/` y no se añaden dependencias. Al cambiarlo se actualiza el estado local de forma optimista y se llama a `updateTask`. Si falla, se restaura el estado anterior y se muestra un `Alert` destructivo.
- **Responsable.** Se pinta `task.assignee.fullName ?? 'Sin nombre'`.

### Navegación

- `app-routes.tsx` añade `/tasks` bajo `ProtectedRoute` y cambia el comodín a `/tasks`.
- `PublicOnlyRoute` redirige a `/tasks`, de modo que tras iniciar sesión o registrarse, cuando el estado pasa a `authenticated`, se llega a la lista.
- `profile-page.tsx` gana un enlace «Ver tareas».

## Risks / Trade-offs

- [Sin orden explícito, SQLite devuelve normalmente el orden de inserción, pero no está garantizado. Alguien puede acabar dependiendo de él] → Se documenta como punto abierto en el proposal. La spec dice que no hay orden garantizado.
- [Actualización optimista: si dos personas cambian a la vez la misma tarea, gana la última y nadie se entera] → Se acepta. Es PA-8, y no hay refresco en vivo en este change.
- [Si el token se revoca con la lista abierta, las llamadas devuelven `401` y la página muestra «Tu sesión ha caducado. Vuelve a iniciar sesión.», pero no expulsa a la persona al login] → El aviso queda fijado en la spec; la expulsión automática se acepta como fuera de alcance.
- [`useAuthForm` reutilizado fuera de auth confunde por el nombre] → Renombrarlo es una refactorización aparte.
- [Sin tests, las regresiones solo se detectan a mano] → Es la restricción del change. Cada tarea de tasks.md se verifica con typecheck, lint y comprobaciones manuales con curl o en el navegador.

## Migration Plan

`node ace migration:run` crea la tabla y regenera `database/schema.ts`. Arrancar el servidor regenera `.adonisjs/`. Para revertir, `node ace migration:rollback`.
