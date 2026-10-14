# Design

## Context

La tarea existe con título, estado y responsable, y la API tiene listar, crear y actualizar. Siguen vigentes las mismas convenciones:

- esquema generado desde las migraciones;
- transformers y `serialize()`;
- VineJS 4 con `vine.create`;
- `lib/api.ts` como único punto de contacto con el backend.

Hay dos datos del entorno que condicionan el diseño:

- **Fechas de VineJS.** `start/validator.ts` convierte toda salida de `vine.date()` en un `DateTime` de Luxon. `vine.date({ formats: ['YYYY-MM-DD'] })` rechaza con la regla `date` los días imposibles (`2026-02-30`), los meses inexistentes y los formatos con hora. Lo comprobé ejecutando el validador antes de diseñar.
- **`null` en el `PATCH`.** El `PATCH` actual exige `status` o `assigneeId` con `requiredIfMissing`, y VineJS trata `null` como ausente en esa regla. Por eso `{ "dueDate": null }` daría `422` si solo se añadiera `dueDate` a esa cadena.

La motivación está en proposal.md y el comportamiento en `specs/tasks/spec.md`.

## Goals / Non-Goals

**Goals:**

- Que la regla de vencimiento viva en un único sitio del backend y que el frontend solo pinte el booleano que recibe.
- Que el veredicto dependa del día de quien mira y se calcule al leer, nunca al guardar.
- Que la fecha no se desplace un día por culpa de los husos horarios en ningún punto del recorrido: navegador, API, BD y vuelta.

**Non-Goals:**

- Pantalla de detalle.
- Ordenar o filtrar por fecha.
- Avisos o recordatorios.
- Tests.
- Exponer la hora: la fecha es solo de calendario.

## Decisions

### Persistencia: columna `date` nullable

La migración añade `table.date('due_date').nullable()` a `tasks`, sin valor por defecto, y su `down` la elimina. Las tareas que ya existen quedan con `null`, es decir, sin fecha y nunca vencidas.

Se elige el tipo `date` y no un `string`:

- el generador de esquema lo mapea a `@column.date()`, de tipo `DateTime`;
- Lucid lo guarda como `yyyy-MM-dd` y lo lee de vuelta en la misma zona del proceso, así que el día se conserva;
- un `string` obligaría a validar el formato también en la capa de datos y no aportaría nada.

Se descarta `dateTime`, porque introduciría una hora y una zona que el dominio no tiene.

### La regla vive en el modelo, sobre un día ISO

`Task` gana el método `isOverdueOn(today: string): boolean`:

```ts
isOverdueOn(today: string) {
  const due = this.dueDate?.toISODate()
  return due != null && due < today && this.status !== 'done'
}
```

Detalles:

- **Comparación como texto.** Se comparan cadenas `YYYY-MM-DD`, cuyo orden lexicográfico coincide con el cronológico. Así no se mezclan zonas al comparar `DateTime`.
- **`<` estricto.** Es lo que hace que una tarea que vence hoy no esté vencida (CA-5).
- **Ningún otro sitio.** No hay columna `is_overdue` ni ningún proceso que la mantenga. Ningún otro punto del código calcula el vencimiento, y el frontend no compara fechas.

### Día de referencia: cabecera `X-Client-Date` con fallback UTC

Un helper de backend, `resolveReferenceDay(request): Promise<string>`, valida la cabecera con VineJS mediante `vine.create({ 'x-client-date': vine.date({ formats: ['YYYY-MM-DD'] }).optional() })`, alimentado con `{ 'x-client-date': request.header('x-client-date') }`.

- **Cabecera mal formada.** Da `422`, con la misma forma `{ errors: [...] }` que el resto de la API y `field: "x-client-date"`.
- **Cabecera ausente.** Se usa `DateTime.utc().toISODate()`.

Todas las acciones del controlador (`index`, `show`, `store` y `update`) llaman al helper antes de responder. En `update` se llama **antes** de guardar, para que una cabecera mala no aplique el cambio. Así se cumple el escenario «Cabecera mal formada».

Alternativas descartadas:

- **Parámetro de URL.** No encaja con POST y PATCH y queda en los logs.
- **Cabecera obligatoria.** Rompe a clientes como curl.
- **Calcular en el frontend.** Lo prohíbe la restricción 2.

**CORS.** `config/cors.ts` tiene `headers: true`, que refleja las cabeceras solicitadas, así que el navegador puede enviar `X-Client-Date` sin tocar la configuración.

### Transformer con día de referencia

`TaskTransformer` necesita el día para calcular `isOverdue`. Antes de implementar hay que comprobar en `@adonisjs/http-transformers` cómo se pasan argumentos extra. Hay dos opciones:

- **Opción A, la preferida.** Usar `TaskTransformer.transform(task, today)`. Los `.d.ts` muestran un parámetro `...rest: ExtractTransformerRestTypes<ConstructorParameters<Self>>`, lo que indica que el constructor del transformer puede recibir argumentos adicionales.
- **Opción B, de reserva.** Si lo anterior no funciona, el controlador asigna antes `task.$extras.referenceDay` o calcula `isOverdue` en el modelo con un setter, y el transformer lo lee.

En los dos casos, `toObject()` devuelve:

```ts
{
  ...this.pick(this.resource, ['id', 'title', 'status']),
  assignee: this.pick(this.resource.assignee, ['id', 'fullName']),
  dueDate: this.resource.dueDate?.toISODate() ?? null,
  isOverdue: this.resource.isOverdueOn(today),
}
```

### Validadores

- **Creación.** `{ title, dueDate: vine.date({ formats: ['YYYY-MM-DD'] }).optional() }`.
- **Actualización.** `{ status: vine.enum(...).optional(), assigneeId: vine.number().exists(...).optional(), dueDate: vine.date({ formats: ['YYYY-MM-DD'] }).nullable().optional() }`, sustituyendo los `requiredIfMissing`.

La regla de «al menos un cambio admitido» pasa a una regla de objeto propia (`vine.createRule`), aplicada al schema raíz con `vine.object({...}).use(atLeastOneOf(['status', 'assigneeId', 'dueDate']))`. Comprueba `value[key] !== undefined`, de modo que `null` cuenta como presente.

- **Error.** La regla informa con `field.report(...)`, para que el error tenga la forma estándar `{ message, rule, field }` y el `422` siga siendo uniforme.
- **Mensaje.** Se mantiene: el frontend nunca envía un `PATCH` vacío.
- **Alternativas descartadas:**
  - **Añadir `dueDate` a los `requiredIfMissing`.** Como VineJS trata `null` como ausente, `{ "dueDate": null }` daría `422` y romperían «Quitar la fecha como único cambio», «Quitar la fecha a una tarea vencida» y «Quitar la fecha sin confirmación».
  - **Quitar la fecha con `""`.** `vine.date` lo rechaza, y la API recibiría `""` pero devolvería `null`, así que un cliente no podría reenviar lo que leyó.
  - **Comprobación a mano en el controlador.** Cumpliría el contrato si lanza el `E_VALIDATION_ERROR` de VineJS con la misma forma `{ errors: [...] }`, pero dejaría una regla del cuerpo fuera del validador. Es el plan B si la firma de la regla de objeto no encaja.
- **Firma.** Antes de escribirla hay que confirmar en `@vinejs/vine` la firma de `vine.createRule` y que `vine.create` acepta un `VineObject` ya construido.

**`isOverdue` del cliente.** VineJS descarta las claves no declaradas, así que el `isOverdue` que mande el cliente desaparece sin ningún código específico.

**Fecha validada.** El `DateTime` que sale de `vine.date` (medianoche local) se asigna tal cual a `task.dueDate`. `null` la quita y `undefined` la deja como estaba.

### Controlador y ruta

- **`show`.** `Task.query().where('id', params.id).preload('assignee').firstOrFail()`, que da `404`.
- **Ruta.** `router.get(':id', [controllers.Tasks, 'show'])` dentro del grupo `tasks` ya protegido. El borrado sigue sin ruta, así que `DELETE` sigue respondiendo `404`.

### Frontend: día local y API

`lib/api.ts` añade a **todas** las peticiones la cabecera `X-Client-Date` con el día local. Se calcula con `getFullYear()`, `getMonth()` y `getDate()` del `Date` local, no con `toISOString()`, que daría el día UTC y fallaría cerca de medianoche. Se manda en todas las peticiones porque es inocuo en las de auth y así ninguna función de tareas puede olvidarlo.

Más cambios en el cliente:

- **Funciones.** Nueva `getTask(token, id)`. `UpdateTaskPayload` gana `dueDate?: string | null`.
- **Tipos.** `Task` gana `dueDate: string | null` e `isOverdue: boolean`.
- **Traducciones.** Las reglas `date` y `date.format` dan «Introduce una fecha completa y válida.», y `dueDate` gana su etiqueta en `FIELD_LABELS`.

### Frontend: panel desplegable

En `tasks-page.tsx`, el título de cada fila pasa a ser un `<button>` con estilo de texto, `aria-expanded` y `aria-controls` hacia el panel. Solo puede haber un panel abierto a la vez, guardado en un estado `openTaskId`.

Al abrirse, el panel llama a `getTask` y sustituye la tarea en el estado local de la lista. La lista ya recibe `dueDate` e `isOverdue`, pero no los pinta; la lectura individual garantiza datos frescos al abrir.

El panel contiene, dentro de un contenedor con borde superior (`grid gap-3`):

- **Fecha.** Un `Label` «Fecha de vencimiento» con un `Input type="date"`. En `onChange`:
  - si `event.target.validity.badInput` o el valor es `''` con el campo a medio escribir, se muestra «Introduce una fecha completa y válida.» con `FieldError` y no se envía nada;
  - con un valor completo, se llama a `updateTask(token, id, { dueDate: value })`;
  - un `422` de la API muestra el mismo mensaje y restaura el valor anterior;
  - el éxito sustituye la tarea con la respuesta.

  El campo es controlado y su valor siempre refleja la última fecha guardada. La opción de borrar del propio campo nativo no se trata como «quitar»: quitar la fecha se hace con el botón.
- **Quitar fecha.** Un `Button variant="outline"` que llama directamente a `updateTask(..., { dueDate: null })`, sin confirmación. Aparece deshabilitado si no hay fecha.
- **Señal de vencida.** Solo si `task.isOverdue`. Es un `<p role="status">` con `AlertCircleIcon` y el texto «Vencida», en `text-destructive` y con el texto siempre presente, para no depender solo del color.
- **Estado.** El mismo `<select>` de estado que la fila, extraído a un pequeño componente local `StatusSelect` reutilizado en los dos sitios. Comparten `handleStatusChange`, así que cambiar el estado en el panel actualiza la fila y la señal con la respuesta del servidor.

La actualización de la fecha **no es optimista**, a diferencia del estado. Ante un error hay que conservar la fecha anterior (CA-14), y la respuesta trae el `isOverdue` recalculado, que el cliente no puede calcular por su cuenta. El campo se deshabilita mientras dura la petición.

**Sesión caducada.** Un `401` en estas llamadas muestra el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.» en el `Alert` general, igual que hoy.

## Risks / Trade-offs

- [El `DateTime` que sale de `vine.date` es medianoche local del servidor. Si Lucid lo serializara convirtiéndolo a UTC, en husos positivos se guardaría el día anterior] → Lucid formatea `@column.date` con `toISODate()` en la zona del propio `DateTime`, que es la local. La tarea 2.x lo verifica con curl comprobando que `"2026-10-20"` vuelve como `"2026-10-20"`.
- [Sin cabecera, el día es UTC, y cerca de medianoche puede no coincidir con el de quien llama] → Solo afecta a clientes que no mandan la cabecera. El frontend siempre la manda.
- [El reloj del cliente puede estar mal y declarar otro día] → Se acepta. El veredicto es por definición el del día de quien mira, y el dato no se persiste.
- [El panel hace una petición extra al abrirse aunque la lista ya traiga la fecha] → Es el precio de la lectura individual que pide la restricción 5. Garantiza datos frescos y es una sola petición por apertura.
- [`<input type="date">` se ve distinto en cada navegador y su soporte de `badInput` varía] → Si el navegador entrega `''` sin `badInput`, no se envía nada y se conserva la fecha. Ese es el comportamiento seguro de CA-14.
- [Sustituir `requiredIfMissing` por una regla propia toca un contrato ya verificado] → La tarea 2.x repite los casos de curl de «La actualización exige un cambio admitido».

## Migration Plan

`node ace migration:run` añade la columna y regenera `database/schema.ts`. Arrancar el servidor regenera `.adonisjs/`. Para revertir, `node ace migration:rollback` elimina la columna, y la fecha de las tareas se pierde.

## Open Questions

- **Mecanismo del transformer (Opción A o B).** Se resuelve leyendo los `.d.ts` en la primera tarea de backend, sin cambiar la spec ni el desglose.
