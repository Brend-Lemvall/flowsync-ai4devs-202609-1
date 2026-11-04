# auth Specification

## Purpose

Permitir que una persona cree una cuenta en FlowSync, inicie y cierre sesión, mantenga la sesión entre recargas y consulte su perfil. El acceso se autentica con tokens opacos de tipo Bearer emitidos por la API.

## Requirements

### Requirement: Registro de cuenta

La API SHALL crear una cuenta nueva al recibir `POST /api/v1/auth/signup` con `fullName`, `email`, `password` y `passwordConfirmation` válidos. Responderá `200` con un cuerpo `{ "data": { "user": <usuario>, "token": <token> } }`, de modo que la persona queda autenticada en el mismo paso, sin tener que iniciar sesión aparte.

#### Scenario: Registro correcto con nombre

- **WHEN** se envía `POST /api/v1/auth/signup` con `{ "fullName": "Ada Lovelace", "email": "ada@example.com", "password": "secreto123", "passwordConfirmation": "secreto123" }`
- **THEN** la respuesta es `200` con `data.user.email` igual a `"ada@example.com"`, `data.user.fullName` igual a `"Ada Lovelace"` y un `data.token` no vacío que ya sirve para llamar a los endpoints protegidos

#### Scenario: Registro correcto sin nombre

- **WHEN** se envía el registro con `"fullName": null` y el resto de campos válidos
- **THEN** la respuesta es `200` y `data.user.fullName` es `null`

### Requirement: Validación de los datos de registro

La API SHALL rechazar con `422` y `{ "errors": [ { "message", "rule", "field" } ] }` un registro con datos inválidos, sin crear la cuenta. Reglas:

- `fullName` MUST estar presente, como cadena o `null`.
- `email` MUST ser un email válido de 254 caracteres como máximo.
- `password` MUST tener entre 8 y 32 caracteres.
- `passwordConfirmation` MUST coincidir con `password`.

#### Scenario: Email con formato inválido

- **WHEN** se envía el registro con `"email": "no-es-un-email"`
- **THEN** la respuesta es `422` e incluye un error con `field: "email"` y `rule: "email"`

#### Scenario: Contraseña demasiado corta

- **WHEN** se envía el registro con `"password": "corta"` y la misma confirmación
- **THEN** la respuesta es `422` e incluye un error con `field: "password"` y `rule: "minLength"`

#### Scenario: Contraseña demasiado larga

- **WHEN** se envía el registro con una contraseña de 33 caracteres
- **THEN** la respuesta es `422` e incluye un error con `field: "password"` y `rule: "maxLength"`

#### Scenario: Confirmación distinta

- **WHEN** se envía el registro con `"password": "secreto123"` y `"passwordConfirmation": "secreto124"`
- **THEN** la respuesta es `422` e incluye un error con `field: "passwordConfirmation"` y `rule: "sameAs"`

#### Scenario: Falta la clave del nombre

- **WHEN** se envía el registro sin la clave `fullName`
- **THEN** la respuesta es `422` e incluye un error con `field: "fullName"` y `rule: "required"`

### Requirement: Email único por cuenta

La API SHALL rechazar con `422` el registro de un email que ya pertenezca a una cuenta. El error llevará `field: "email"` y `rule: "database.unique"`. La comparación distingue mayúsculas de minúsculas: dos emails que solo se diferencian en mayúsculas cuentan como distintos.

#### Scenario: Email ya registrado

- **WHEN** existe una cuenta con `ada@example.com` y se envía otro registro con ese mismo email
- **THEN** la respuesta es `422` con un error `field: "email"`, `rule: "database.unique"`, y no se crea una segunda cuenta

#### Scenario: Mismo email con distintas mayúsculas

- **WHEN** existe una cuenta con `ada@example.com` y se registra `Ada@Example.com`
- **THEN** la respuesta es `200` y se crea una cuenta nueva e independiente

### Requirement: Inicio de sesión

La API SHALL autenticar a una persona al recibir `POST /api/v1/auth/login` con un `email` y un `password` que correspondan a una cuenta existente. Responderá `200` con `{ "data": { "user": <usuario>, "token": <token> } }`. Cada inicio de sesión emite un token nuevo, y los tokens emitidos antes siguen siendo válidos.

#### Scenario: Credenciales correctas

- **WHEN** existe la cuenta `ada@example.com` con contraseña `secreto123` y se envía `POST /api/v1/auth/login` con esas credenciales
- **THEN** la respuesta es `200` con los datos del usuario en `data.user` y un token nuevo en `data.token`

#### Scenario: Varios inicios de sesión conviven

- **WHEN** la misma persona inicia sesión dos veces y obtiene dos tokens distintos
- **THEN** ambos tokens permiten acceder a los endpoints protegidos

### Requirement: Credenciales incorrectas

La API SHALL responder `400` con `{ "errors": [ { "message": "Invalid user credentials" } ] }` cuando el email no pertenece a ninguna cuenta o la contraseña no coincide. La respuesta es la misma en los dos casos, para no revelar si el email está registrado.

#### Scenario: Contraseña incorrecta

- **WHEN** se envía el login con un email registrado y una contraseña errónea
- **THEN** la respuesta es `400` con el mensaje `"Invalid user credentials"` y sin token

#### Scenario: Email no registrado

- **WHEN** se envía el login con un email que no pertenece a ninguna cuenta
- **THEN** la respuesta es `400` con el mismo mensaje `"Invalid user credentials"`

### Requirement: Validación de los datos de inicio de sesión

La API SHALL rechazar con `422` y la forma `{ "errors": [...] }` un login cuyo `email` no sea una dirección válida de 254 caracteres como máximo, o al que le falte `email` o `password`. En el login no se comprueba la longitud de la contraseña.

#### Scenario: Email mal formado en el login

- **WHEN** se envía `POST /api/v1/auth/login` con `"email": "ada"`
- **THEN** la respuesta es `422` e incluye un error con `field: "email"` y `rule: "email"`

#### Scenario: Falta la contraseña

- **WHEN** se envía el login sin la clave `password`
- **THEN** la respuesta es `422` e incluye un error con `field: "password"` y `rule: "required"`

### Requirement: Acceso autenticado con token Bearer

La API SHALL exigir un token válido en la cabecera `Authorization: Bearer <token>` para `GET /api/v1/account/profile` y `POST /api/v1/account/logout`. Si el token falta, no es válido o ya se ha revocado, responderá `401` con `{ "errors": [ { "message": "Unauthorized access" } ] }`. Los tokens no caducan por tiempo: solo dejan de valer cuando se revocan.

#### Scenario: Petición sin token

- **WHEN** se llama a `GET /api/v1/account/profile` sin cabecera `Authorization`
- **THEN** la respuesta es `401` con el mensaje `"Unauthorized access"`

#### Scenario: Token inventado

- **WHEN** se llama a `GET /api/v1/account/profile` con `Authorization: Bearer token-falso`
- **THEN** la respuesta es `401`

### Requirement: Consulta del perfil propio

La API SHALL devolver los datos de la persona autenticada al recibir `GET /api/v1/account/profile` con un token válido. Responderá `200` con `{ "data": <usuario> }`.

#### Scenario: Perfil con token válido

- **WHEN** se llama a `GET /api/v1/account/profile` con el token obtenido al registrarse como `ada@example.com`
- **THEN** la respuesta es `200` y `data.email` es `"ada@example.com"`

### Requirement: Representación pública del usuario

Toda respuesta de la API que incluya un usuario SHALL exponer exactamente `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`, y MUST NOT incluir la contraseña ni su hash. `initials` se calcula así:

- Si hay nombre, se toman las iniciales de sus dos primeras palabras, en mayúsculas.
- Si el nombre tiene una sola palabra, se toman sus dos primeras letras, en mayúsculas.
- Si no hay nombre, se aplica la misma regla a las partes del email antes y después de la `@`.

#### Scenario: Iniciales con nombre y apellido

- **WHEN** la cuenta tiene `fullName` `"Ada Lovelace"`
- **THEN** `initials` es `"AL"`

#### Scenario: Iniciales con un solo nombre

- **WHEN** la cuenta tiene `fullName` `"Ada"`
- **THEN** `initials` es `"AD"`

#### Scenario: Iniciales sin nombre

- **WHEN** la cuenta tiene `fullName` `null` y email `"ada@example.com"`
- **THEN** `initials` es `"AE"`

#### Scenario: La contraseña nunca se expone

- **WHEN** se registra, se inicia sesión o se consulta el perfil
- **THEN** el objeto usuario de la respuesta no contiene ninguna clave con la contraseña ni con su hash

### Requirement: Cierre de sesión

La API SHALL revocar el token con el que se hace la petición al recibir `POST /api/v1/account/logout`. Responderá `200` con el cuerpo `{ "message": "Logged out successfully" }`, sin el envoltorio `data`. Los demás tokens de la misma persona siguen siendo válidos.

#### Scenario: Logout revoca el token usado

- **WHEN** se llama a `POST /api/v1/account/logout` con un token válido y después se usa ese mismo token en `GET /api/v1/account/profile`
- **THEN** el logout responde `200` con `{ "message": "Logged out successfully" }` y la consulta posterior del perfil responde `401`

#### Scenario: Logout no afecta a otras sesiones

- **WHEN** una persona tiene dos tokens activos y cierra sesión con uno de ellos
- **THEN** el otro token sigue permitiendo consultar el perfil

### Requirement: Respuestas siempre en JSON

La API SHALL responder en JSON a todas las peticiones de autenticación, errores incluidos, aunque el cliente no envíe la cabecera `Accept: application/json`.

#### Scenario: Error sin cabecera Accept

- **WHEN** se llama a `GET /api/v1/account/profile` sin token y sin cabecera `Accept`
- **THEN** la respuesta es `401` con cuerpo JSON `{ "errors": [...] }`, no una página HTML ni una redirección

### Requirement: Pantalla de inicio de sesión

La aplicación web SHALL ofrecer en `/login` la pantalla «Inicia sesión», que contiene:

- un formulario con los campos «Email» y «Contraseña»;
- un botón «Entrar» que mientras se envía muestra «Entrando…» y queda deshabilitado;
- un enlace «Crea una» que lleva a `/register`.

#### Scenario: Inicio de sesión correcto en pantalla

- **WHEN** una persona sin sesión escribe un email y una contraseña correctos en `/login` y pulsa «Entrar»
- **THEN** pasa a ver la lista de tareas en `/tasks`

#### Scenario: Credenciales incorrectas en pantalla

- **WHEN** una persona envía el formulario de login con una contraseña errónea
- **THEN** ve, encima del formulario, el aviso «El email o la contraseña no son correctos.» y sigue en `/login`

#### Scenario: Botón bloqueado durante el envío

- **WHEN** una persona pulsa «Entrar» y la respuesta todavía no ha llegado
- **THEN** el botón muestra «Entrando…» y no se puede volver a pulsar

### Requirement: Pantalla de registro

La aplicación web SHALL ofrecer en `/register` la pantalla «Crea tu cuenta», que contiene:

- los campos «Nombre completo (opcional)», «Email», «Contraseña», con la indicación «Entre 8 y 32 caracteres.», y «Repite la contraseña»;
- un botón «Crear cuenta» que mientras se envía muestra «Creando cuenta…» y queda deshabilitado;
- un enlace «Inicia sesión» que lleva a `/login`.

Si la cuenta se crea, la persona queda con la sesión iniciada y pasa a la lista de tareas.

#### Scenario: Registro correcto en pantalla

- **WHEN** una persona sin sesión rellena el formulario de registro con datos válidos y pulsa «Crear cuenta»
- **THEN** pasa a ver la lista de tareas en `/tasks`, ya con la sesión iniciada

#### Scenario: Contraseñas que no coinciden se detectan antes de enviar

- **WHEN** una persona escribe valores distintos en «Contraseña» y «Repite la contraseña» y pulsa «Crear cuenta»
- **THEN** ve «Las contraseñas no coinciden.» bajo «Repite la contraseña» y no se envía ninguna petición de registro

#### Scenario: Nombre en blanco equivale a sin nombre

- **WHEN** una persona se registra dejando «Nombre completo» vacío o solo con espacios
- **THEN** la cuenta se crea sin nombre y el perfil muestra «Sin nombre»

### Requirement: Errores de formulario en castellano y por campo

La aplicación web SHALL mostrar en castellano los errores de la API: cada error de validación bajo su campo, y los que no corresponden a ningún campo visible en un aviso general encima del formulario.

#### Scenario: Email duplicado en el registro

- **WHEN** una persona intenta registrarse con un email que ya tiene cuenta
- **THEN** ve «Ese email ya está registrado. Inicia sesión en su lugar.» bajo el campo «Email»

#### Scenario: Email inválido

- **WHEN** una persona envía el login o el registro con un email mal formado
- **THEN** ve «Introduce una dirección de email válida.» bajo el campo «Email»

#### Scenario: Contraseña fuera de rango en el registro

- **WHEN** una persona se registra con una contraseña de menos de 8 caracteres
- **THEN** ve «La contraseña debe tener al menos 8 caracteres.» bajo el campo «Contraseña»

#### Scenario: Error del servidor

- **WHEN** la API responde con un error no previsto, por ejemplo un `500`
- **THEN** la persona ve el aviso «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.»

#### Scenario: Backend apagado

- **WHEN** una persona envía el formulario de login o de registro y el servidor no responde a nivel de red
- **THEN** ve el aviso «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.» y el botón vuelve a estar disponible

### Requirement: Persistencia de la sesión entre recargas

La aplicación web SHALL conservar la sesión al recargar o reabrir la página en el mismo navegador. Al arrancar, valida la sesión guardada contra la API mostrando un indicador de carga. Si la API la rechaza, la descarta; si falla la red o el servidor, la conserva para una recarga posterior. En ambos casos explica el motivo en el login.

#### Scenario: Recarga con sesión válida

- **WHEN** una persona con sesión iniciada recarga `/profile`
- **THEN** ve brevemente un indicador de carga y después su perfil, sin pasar por el login

#### Scenario: Sesión revocada o inválida al recargar

- **WHEN** la página arranca con una sesión guardada que la API ya no reconoce
- **THEN** la persona llega a `/login` con el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.» y una recarga posterior no la devuelve al perfil

#### Scenario: Backend caído al recargar

- **WHEN** la página arranca con una sesión guardada y la API no está disponible
- **THEN** la persona llega a `/login` con el aviso «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.» y, al recargar con la API ya disponible, vuelve a ver su perfil sin iniciar sesión

### Requirement: Protección de rutas en la aplicación web

La aplicación web SHALL aplicar estas reglas de navegación:

- `/profile` y `/tasks` solo son accesibles con sesión iniciada.
- `/login` y `/register` solo son accesibles sin sesión.
- Cualquier otra ruta redirige a `/tasks`.
- Mientras se comprueba la sesión guardada, no se redirige: se muestra el indicador de carga.

#### Scenario: Acceso al perfil sin sesión

- **WHEN** una persona sin sesión abre `/profile`
- **THEN** se la redirige a `/login`

#### Scenario: Acceso al login con sesión

- **WHEN** una persona con sesión iniciada abre `/login` o `/register`
- **THEN** se la redirige a `/tasks`

#### Scenario: Ruta desconocida

- **WHEN** una persona abre una ruta que no existe, por ejemplo `/cualquier-cosa`
- **THEN** se la redirige a `/tasks`, y de ahí a `/login` si no tiene sesión

### Requirement: Pantalla de perfil

La aplicación web SHALL mostrar en `/profile` los datos de la persona autenticada:

- un círculo con sus iniciales;
- su nombre completo, o «Sin nombre» si no tiene;
- su email;
- la fila «Miembro desde» con la fecha de alta en formato largo en castellano, por ejemplo «7 de octubre de 2026»;
- un enlace a la lista de tareas;
- un botón «Cerrar sesión».

#### Scenario: Perfil con nombre

- **WHEN** una persona registrada como «Ada Lovelace» con `ada@example.com` abre `/profile`
- **THEN** ve «AL», «Ada Lovelace», «ada@example.com» y la fecha de alta junto a «Miembro desde»

#### Scenario: Volver a la lista desde el perfil

- **WHEN** una persona con sesión pulsa el enlace a la lista de tareas en `/profile`
- **THEN** llega a `/tasks`

### Requirement: Cierre de sesión desde la aplicación web

La aplicación web SHALL cerrar la sesión local de inmediato cuando la persona pulsa «Cerrar sesión», que pasa a mostrar «Cerrando sesión…» y queda deshabilitado. La persona vuelve a `/login` aunque la API no confirme la revocación. Tras cerrar sesión, recargar la página no restaura la sesión.

#### Scenario: Cerrar sesión

- **WHEN** una persona con sesión pulsa «Cerrar sesión» en `/profile`
- **THEN** llega a `/login` sin ningún aviso de error y, si recarga, sigue en `/login`

#### Scenario: Cerrar sesión con el backend caído

- **WHEN** una persona pulsa «Cerrar sesión» y la API no está disponible
- **THEN** llega igualmente a `/login` y la sesión queda cerrada en ese navegador
