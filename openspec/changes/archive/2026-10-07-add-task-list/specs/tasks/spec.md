# Spec Delta

## Purpose

Dar al equipo una única lista compartida de tareas: cada tarea tiene título, responsable y estado, se crea escribiendo solo el título y su estado se mantiene al día desde la propia lista.

## ADDED Requirements

### Requirement: Las tareas exigen sesión iniciada

La API SHALL exigir un token Bearer válido en todas las operaciones de tareas y responder `401` si falta o no es válido, sin devolver ninguna tarea. Las únicas operaciones son:

- `GET /api/v1/tasks` para listar;
- `POST /api/v1/tasks` para crear;
- `PATCH /api/v1/tasks/:id` para actualizar.

No existe la lectura individual ni el borrado.

#### Scenario: Listar sin sesión

- **WHEN** se llama a `GET /api/v1/tasks` sin cabecera `Authorization`
- **THEN** la respuesta es `401` y el cuerpo no contiene ninguna tarea

#### Scenario: Crear sin sesión

- **WHEN** se llama a `POST /api/v1/tasks` con un título válido pero sin token
- **THEN** la respuesta es `401` y no se crea ninguna tarea

#### Scenario: No hay lectura individual ni borrado

- **WHEN** una persona autenticada llama a `GET /api/v1/tasks/1` o a `DELETE /api/v1/tasks/1`
- **THEN** la respuesta es `404` y ninguna tarea cambia

### Requirement: Representación de una tarea

Toda tarea devuelta por la API SHALL tener exactamente:

- `id`;
- `title`;
- `status`, que vale `pending`, `in_progress` o `done`;
- `assignee`, con solo el `id` y el `fullName` del responsable (`fullName` puede ser `null`).

La tarea MUST NOT incluir el email ni ningún otro dato de cuenta del responsable, ni ninguna fecha de vencimiento.

#### Scenario: Forma de una tarea

- **WHEN** una persona autenticada obtiene una tarea asignada a «Ada Lovelace» en cualquier respuesta de la API
- **THEN** la tarea tiene la forma `{ "id": 1, "title": "...", "status": "pending", "assignee": { "id": 7, "fullName": "Ada Lovelace" } }`, sin `email` ni fecha de vencimiento

### Requirement: Lista única compartida

La API SHALL devolver en `GET /api/v1/tasks` todas las tareas del espacio, con la forma `{ "data": [ <tarea>, ... ] }`. El resultado MUST ser el mismo sea quien sea la persona autenticada que lo pide. No hay tareas privadas ni filtro por persona, y no se garantiza ningún orden.

#### Scenario: Dos personas ven lo mismo

- **WHEN** dos personas autenticadas distintas piden `GET /api/v1/tasks` sin que nadie haya cambiado nada entre medias
- **THEN** las dos reciben `200` con exactamente el mismo conjunto de tareas

#### Scenario: Las tareas ajenas también aparecen

- **WHEN** Bea crea una tarea, que queda asignada a ella, y Ada pide la lista
- **THEN** la tarea de Bea está en la respuesta que recibe Ada

#### Scenario: Espacio sin tareas

- **WHEN** no se ha creado ninguna tarea y una persona autenticada pide la lista
- **THEN** la respuesta es `200` con `{ "data": [] }`

#### Scenario: Listar no modifica nada

- **WHEN** se pide la lista varias veces seguidas
- **THEN** ninguna tarea cambia de estado ni de responsable

### Requirement: Crear una tarea con solo el título

La API SHALL crear una tarea al recibir `POST /api/v1/tasks` con un `title` válido y responder `201` con `{ "data": <tarea> }`. El título es lo único que se acepta al crear. Cualquier otra clave del cuerpo se ignora, de modo que no se pueden fijar el estado ni el responsable en la creación.

#### Scenario: Crear con título

- **WHEN** una persona autenticada envía `POST /api/v1/tasks` con `{ "title": "Preparar la demo" }`
- **THEN** la respuesta es `201` con la tarea creada, cuyo `title` es `"Preparar la demo"`, y la tarea aparece después en `GET /api/v1/tasks`

#### Scenario: El estado y el responsable del cuerpo se ignoran

- **WHEN** se envía `POST /api/v1/tasks` con `{ "title": "X", "status": "done", "assigneeId": 99 }`
- **THEN** la tarea se crea igualmente con el estado y el responsable por defecto

### Requirement: Valores por defecto al crear

Una tarea recién creada SHALL nacer en estado `pending` y con quien la crea como responsable.

#### Scenario: Nace pendiente y asignada a quien la crea

- **WHEN** Ada, autenticada, crea una tarea indicando solo el título
- **THEN** la tarea creada tiene `status` igual a `"pending"` y `assignee.id` igual al id de Ada

### Requirement: Título obligatorio y acotado

La API SHALL rechazar con `422` y `{ "errors": [ { "message", "rule", "field": "title" } ] }` la creación de una tarea cuyo título falte, quede vacío tras quitar los espacios de los extremos o supere los 255 caracteres. En esos casos no se crea ninguna tarea. Un título válido se guarda sin los espacios de los extremos y nunca se recorta de otro modo.

#### Scenario: Sin título

- **WHEN** se envía `POST /api/v1/tasks` con `{}`
- **THEN** la respuesta es `422` con un error en `field: "title"`, y la lista no cambia

#### Scenario: Título solo con espacios

- **WHEN** se envía `POST /api/v1/tasks` con `{ "title": "   " }`
- **THEN** la respuesta es `422` con un error en `field: "title"` y no se crea ninguna tarea sin texto

#### Scenario: Título demasiado largo

- **WHEN** se envía un título de 256 caracteres
- **THEN** la respuesta es `422` con un error en `field: "title"` y `rule: "maxLength"`, y no se guarda ninguna versión recortada

#### Scenario: Título en el límite

- **WHEN** se envía un título de exactamente 255 caracteres
- **THEN** la respuesta es `201` y el título se guarda completo

#### Scenario: Espacios en los extremos

- **WHEN** se envía `{ "title": "  Revisar PR  " }`
- **THEN** la tarea se crea con `title` igual a `"Revisar PR"`

### Requirement: Tres estados fijos

El estado de una tarea SHALL ser siempre exactamente uno de `pending`, `in_progress` o `done`. La API MUST rechazar con `422` cualquier otro valor, incluidos los nombres en castellano. No existe ninguna operación para añadir, renombrar ni eliminar estados.

#### Scenario: Estado desconocido

- **WHEN** se envía `PATCH /api/v1/tasks/:id` con `{ "status": "blocked" }`
- **THEN** la respuesta es `422` con un error en `field: "status"` y el estado de la tarea no cambia

#### Scenario: Estado en castellano

- **WHEN** se envía `PATCH /api/v1/tasks/:id` con `{ "status": "Hecho" }`
- **THEN** la respuesta es `422` y el estado de la tarea no cambia

### Requirement: Actualizar estado y responsable

La API SHALL actualizar una tarea existente al recibir `PATCH /api/v1/tasks/:id` con `status`, `assigneeId` o los dos, y responder `200` con `{ "data": <tarea> }` ya actualizada. Cualquier persona autenticada puede actualizar cualquier tarea, también las que llevan otras personas. La transición entre estados es libre, incluido volver atrás desde `done`. El título nunca cambia por esta vía.

#### Scenario: Cambiar el estado de una tarea propia

- **WHEN** Ada envía `PATCH /api/v1/tasks/:id` con `{ "status": "in_progress" }` sobre una tarea suya
- **THEN** la respuesta es `200` y la tarea tiene `status` igual a `"in_progress"`

#### Scenario: Cambiar el estado de una tarea ajena

- **WHEN** Ada cambia el estado de una tarea cuyo responsable es Bea
- **THEN** la respuesta es `200` y el cambio se aplica igual que en una tarea propia

#### Scenario: Volver atrás desde Hecho

- **WHEN** se envía `{ "status": "pending" }` sobre una tarea en `done`
- **THEN** la respuesta es `200` y la tarea vuelve a `pending`

#### Scenario: Reasignar a otra persona

- **WHEN** se envía `{ "assigneeId": <id de Bea> }` sobre una tarea de Ada
- **THEN** la respuesta es `200` y `assignee` pasa a ser Bea, con su `id` y su `fullName`

#### Scenario: Responsable inexistente

- **WHEN** se envía `{ "assigneeId": 999999 }` y no existe ningún usuario con ese id
- **THEN** la respuesta es `422` con un error en `field: "assigneeId"` y la tarea no cambia

#### Scenario: Tarea inexistente

- **WHEN** se envía `PATCH /api/v1/tasks/999999` y no existe ninguna tarea con ese id
- **THEN** la respuesta es `404`

### Requirement: La actualización exige un cambio admitido

La API SHALL rechazar con `422` y la forma `{ "errors": [...] }` un `PATCH /api/v1/tasks/:id` cuyo cuerpo no traiga ni `status` ni `assigneeId`, aunque traiga otras claves como `title`. En ese caso la tarea no cambia. Si el cuerpo trae `status` o `assigneeId` junto con otras claves, las demás se ignoran.

#### Scenario: Cuerpo vacío

- **WHEN** se envía `PATCH /api/v1/tasks/:id` con `{}`
- **THEN** la respuesta es `422` y la tarea no cambia

#### Scenario: Intento de cambiar solo el título

- **WHEN** se envía `PATCH /api/v1/tasks/:id` con `{ "title": "Otro título" }`
- **THEN** la respuesta es `422` y la tarea conserva su título original

#### Scenario: Título junto a un estado

- **WHEN** se envía `PATCH /api/v1/tasks/:id` con `{ "status": "done", "title": "Otro título" }`
- **THEN** la respuesta es `200`, la tarea pasa a `done` y conserva su título original

### Requirement: Pantalla de la lista de tareas

La aplicación web SHALL mostrar en `/tasks`, solo con la sesión iniciada, la lista compartida con una fila por tarea. Cada fila muestra:

- el título;
- el nombre del responsable;
- el estado como «Pendiente», «En curso» o «Hecho».

No hay otra vista de tareas, ni ninguna de «mis tareas». La lista no muestra fechas, marcas de vencida ni señales de presencia.

#### Scenario: Quién está en qué de un vistazo

- **WHEN** una persona con sesión abre `/tasks` y hay tareas de varias personas
- **THEN** ve en cada fila el título, el nombre del responsable y el estado, sin abrir nada

#### Scenario: Sin sesión no se ve la lista

- **WHEN** una persona sin sesión intenta abrir `/tasks`
- **THEN** se la redirige a `/login` y no ve ninguna tarea

#### Scenario: Responsable identificado por su nombre

- **WHEN** una fila corresponde a una tarea cuyo responsable se llama «Bea Ruiz»
- **THEN** la fila muestra «Bea Ruiz», y no su email ni su id

#### Scenario: Responsable sin nombre

- **WHEN** el responsable de una tarea no tiene nombre puesto
- **THEN** la fila muestra «Sin nombre», y no su email ni su id

#### Scenario: Sin fechas en la lista

- **WHEN** una persona recorre la lista
- **THEN** no ve ninguna fecha ni ninguna marca de vencimiento en ninguna fila

### Requirement: Estado vacío de la lista

La aplicación web SHALL mostrar, cuando no existe ninguna tarea, un mensaje que explique que esta es la lista compartida del equipo y que invite a crear la primera tarea, en lugar de una lista vacía sin más.

#### Scenario: Primer uso

- **WHEN** una persona con sesión abre `/tasks` y no hay ninguna tarea
- **THEN** ve una explicación de qué es la lista y una invitación a crear la primera tarea con el formulario de la pantalla

### Requirement: Crear una tarea desde la lista

La aplicación web SHALL ofrecer en `/tasks` un formulario con un único campo, el título, y un botón para crear la tarea. El formulario MUST NOT ofrecer ni sugerir responsable, estado, fecha ni ningún otro dato. Al crearse, la tarea aparece en la lista sin recargar ni navegar, y el campo se vacía.

#### Scenario: Crear desde la pantalla

- **WHEN** una persona escribe «Preparar la demo» y pulsa el botón de crear
- **THEN** ve la nueva fila «Preparar la demo» con su propio nombre como responsable y en «Pendiente», sin recargar la página

#### Scenario: El formulario solo pide el título

- **WHEN** una persona recorre el formulario de creación
- **THEN** solo encuentra el campo de título y el botón de crear

### Requirement: Errores del título en pantalla

La aplicación web SHALL explicar en castellano, junto al campo de título, por qué no se ha creado una tarea. No se añade ninguna fila cuando la creación falla.

#### Scenario: Título vacío o en blanco

- **WHEN** una persona pulsa el botón de crear con el título vacío o solo con espacios
- **THEN** ve bajo el campo el mensaje «Falta rellenar el título.» y no aparece ninguna fila nueva

#### Scenario: Título demasiado largo en pantalla

- **WHEN** una persona intenta crear una tarea con un título de más de 255 caracteres
- **THEN** ve bajo el campo «El título no puede superar los 255 caracteres.» y no se guarda ninguna versión recortada

### Requirement: Cambiar el estado desde la fila

La aplicación web SHALL permitir cambiar el estado de cualquier tarea desde su propia fila, con un selector que ofrece exactamente «Pendiente», «En curso» y «Hecho». El cambio se aplica sin abrir la tarea, sin diálogo de confirmación y sin rellenar ningún campo, y se refleja en la fila de inmediato. Si la API rechaza el cambio, la fila vuelve a su estado anterior y la persona ve un aviso.

#### Scenario: Cambio de estado en la fila

- **WHEN** una persona elige «En curso» en el selector de una tarea en «Pendiente»
- **THEN** la fila muestra «En curso» de inmediato y el cambio queda guardado, de modo que al recargar la página sigue en «En curso»

#### Scenario: Tarea de otra persona

- **WHEN** una persona cambia el estado de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica igual, sin advertencias ni permisos especiales

#### Scenario: Solo tres destinos

- **WHEN** una persona despliega el selector de estado de una fila
- **THEN** las únicas opciones son «Pendiente», «En curso» y «Hecho»

#### Scenario: Fallo al guardar el cambio

- **WHEN** una persona cambia el estado y la API no responde o devuelve un error
- **THEN** la fila vuelve al estado que tenía y se muestra un aviso explicando que no se ha podido guardar el cambio

### Requirement: Sesión caducada con la lista abierta

La aplicación web SHALL avisar con «Tu sesión ha caducado. Vuelve a iniciar sesión.» cuando la API rechace por sesión inválida una creación o un cambio de estado hecho desde `/tasks`. En ese caso no se añade ninguna fila y la fila afectada conserva el estado que tenía.

#### Scenario: Crear con la sesión revocada

- **WHEN** la sesión de una persona se revoca mientras tiene `/tasks` abierta y después intenta crear una tarea
- **THEN** ve el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.» y no aparece ninguna fila nueva

#### Scenario: Cambiar el estado con la sesión revocada

- **WHEN** la sesión de una persona se revoca mientras tiene `/tasks` abierta y después cambia el estado de una fila
- **THEN** ve el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.» y la fila vuelve al estado que tenía
