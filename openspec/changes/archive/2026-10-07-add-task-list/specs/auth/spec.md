# Spec Delta

## MODIFIED Requirements

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
