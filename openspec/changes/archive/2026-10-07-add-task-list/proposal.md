# Proposal

## Why

FlowSync todavía no tiene tareas: solo cuentas y acceso. Sin una lista compartida no hay dónde apuntar el trabajo ni manera de responder «quién está en qué», la pregunta para la que existe el producto (RF-16 y RF-17 del PRD). Esta lista es además la base de toda la épica de gestión de tareas.

## What Changes

**Alcance.** Entran cinco historias del backlog:

- E3-1, la lista compartida;
- E2-1, crear una tarea con solo el título;
- E2-2, título obligatorio;
- E2-3, la tarea nace pendiente y asignada a quien la crea;
- E2-4, cambiar el estado desde la lista.

**Backend.** Se añade la entidad tarea, con título, estado y responsable. La API tiene exactamente tres operaciones autenticadas: listar todas las tareas, crear una y actualizarla.

- **Estado.** Es un conjunto cerrado que viaja como `pending`, `in_progress` o `done`. Cualquier otro valor se rechaza con `422`. Se puede pasar libremente de cualquier estado a cualquier otro, incluido volver atrás desde `done`.
- **Crear.** El cuerpo solo lleva `title`. La tarea nace en `pending` y su responsable es quien la crea.
- **Título.** Es obligatorio, no puede quedar en blanco (los espacios no cuentan) y tiene como máximo 255 caracteres. Si se pasa, se rechaza con `422` y nunca se recorta en silencio.
- **Actualizar.** Acepta `status` y el responsable (`assigneeId`). Cualquier persona autenticada puede actualizar cualquier tarea.
- **Responsable en la API.** Se expone solo su `id` y su `fullName`, nunca el registro de usuario entero.

**Frontend.** Nueva pantalla protegida `/tasks`, construida con los componentes de `components/ui/` y el mismo patrón de páginas y rutas que el login.

- Un formulario con un único campo, el título.
- Una fila por tarea, con título, nombre del responsable («Sin nombre» si no tiene) y un selector con «Pendiente», «En curso» y «Hecho» para cambiar el estado ahí mismo.
- Un estado vacío que explica qué es la lista e invita a crear la primera tarea.
- La tarea recién creada aparece sin recargar.

**Navegación.** `/tasks` pasa a ser la pantalla de inicio. Al iniciar sesión o registrarse se llega ahí, y las rutas desconocidas redirigen ahí. El perfil sigue en `/profile`, y las dos pantallas se enlazan entre sí.

**Fuera de alcance:**

- fecha de vencimiento: no existe ni se deja preparada, y la lista no muestra fechas ni marcas de vencida;
- lectura individual de una tarea, borrado, edición del título y endpoints de equipo;
- reasignar desde la interfaz;
- vista de «mis tareas»;
- refresco automático de la lista (E3-2);
- tests.

**Puntos abiertos:**

- **Orden de la lista (PA-3).** No hay regla decidida. La API no ordena explícitamente y el orden de las tareas no está garantizado. Hasta que se resuelva, CA-5 de E3-1 («enumerar el trabajo de cada persona») solo se cumple recorriendo la lista entera.
- **Umbral del título (PA-9).** Los 255 caracteres son un límite técnico provisional, no una decisión de producto.
- **Transiciones (PA-7).** Se dejan libres. Queda por decidir si eso basta para deshacer un «Hecho» marcado por error.
- **Reasignar desde la interfaz (RF-10).** Necesita una forma de elegir entre las personas registradas, que no existe. De momento la reasignación solo es posible por API.

## Capabilities

### New Capabilities

- `tasks`: la lista compartida de tareas del equipo. Cubre la creación con solo el título, los valores por defecto (pendiente y asignada a quien la crea), los tres estados fijos, el cambio de estado y de responsable y la visualización en una lista única para todo el equipo.

### Modified Capabilities

- `auth`: tras iniciar sesión o registrarse, y desde rutas desconocidas o desde login y registro con la sesión ya iniciada, se llega a `/tasks` en vez de `/profile`.

## Impact

- **Backend:**
  - una migración nueva, que crea la tabla de tareas con clave ajena a usuarios;
  - un modelo, un validador, un transformer y un controlador nuevos;
  - tres rutas nuevas bajo `/api/v1/tasks` dentro del grupo autenticado;
  - se regeneran `database/schema.ts` y `.adonisjs/`.
- **Frontend:**
  - funciones nuevas de tareas en el cliente de la API y tipos en `lib/types.ts`;
  - una página y una ruta nuevas;
  - cambian los destinos de redirección de los guards y de la ruta comodín, y se añade un enlace en el perfil.
- **Dependencias:** ninguna nueva. El selector de estado es un `<select>` nativo, porque `components/ui/` no tiene un componente de selección.
