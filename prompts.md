# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

---

> Montaje del harness: no hay prompts propios. Las ocho piezas se copiaron del paquete ya
> preparado de `~/harness/` (ver `INSTALAR.md`), y ninguna transcripción local registra con qué
> prompts se generó ese paquete. Los prompts de abajo empiezan con el ticket en la copia con harness.

## Prompt 1

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
/priority-ticket
```

**Qué salió:** la JQL devolvió primero un ticket de otro proyecto (SCRUM-636); Claude eligió FLOW-10 avisándolo y detectó que la API envuelve las respuestas en `{ data }`, no `{ user, token }` como decía el ticket.

## Prompt 2

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
sí, aplícalo
```

**Qué salió:** implementó los 6 archivos del plan; build y lint limpios y los 7 AC probados en el navegador contra el backend real.

## Prompt 3

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
/commit
```

**Qué salió:** la revisión adversarial dio 5 hallazgos (3 arreglados, 2 descartados); el `git commit` fue denegado por permisos y no se llegó a commitear.

## Prompt 4

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
vale, espero la revisión
```

## Prompt 5

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
¿cómo va la revisión?
```

## Prompt 6

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
vale, avísame cuando termine
```

## Prompt 7

**Modelo:** — (comando de shell, no prompt al modelo)
**Herramienta:** Claude Code (prefijo `!`)

```
! rm -rf .playwright-mcp
```

**Qué salió:** borró los artefactos de la prueba con Playwright, que Claude no tenía permiso para borrar.

## Prompt 8

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
/commit
```

**Qué salió:** una re-revisión de los arreglos encontró un hallazgo ALTA (la validación nativa de `type="email"` rechazaba emails no-ASCII que el backend acepta); se arregló y se lanzó una tercera revisión.

## Prompt 9

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
vale, avísame cuando termine
```

## Prompt 10

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
¿cómo va la revisión?
```

## Prompt 11

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
vale, avísame cuando termine
```

## Prompt 12

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code

```
mientras tanto dame una archivo con los prompts listados que te di durante todo el ejercicio, consulta la memoria de ser necesario
```

**Qué salió:** la memoria estaba vacía; se reconstruyó desde la transcripción local de la sesión.

## Prompt 13

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code, en la copia sin harness (`flowsync-sin-harness/`)

```
cd ~/flowsync-sin-harness && claude
```

**Qué salió:** fue un pegado por error del comando de arranque. Claude respondió que la sesión ya estaba abierta en esa carpeta.

## Prompt 14

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code, en la copia sin harness (`flowsync-sin-harness/`)

```
[PENDIENTE DE LANZAR]
Este es el ticket de Jira que tengo que implementar:

FLOW-10 · Implementar login en el frontend
Como usuario registrado quiero iniciar sesión desde la web para acceder a mi cuenta.

Contexto
- La API ya expone POST /api/v1/auth/login (backend/start/routes.ts). Recibe { email, password }
  y devuelve { user, token }. El user trae id, fullName, email, createdAt, updatedAt, initials.
- GET /api/v1/account/profile devuelve el usuario autenticado con header Authorization: Bearer <token>.
- El frontend es el scaffold de Vite sin router, sin cliente HTTP ni gestor de estado.

Criterios de aceptación
1. Formulario de login con campos email y password y botón "Entrar".
2. Validación en cliente alineada con backend/app/validators/user.ts: email con formato válido y
   máximo 254 caracteres; password obligatorio.
3. Al enviar, llama a POST /api/v1/auth/login. Si responde 200, guarda el token y muestra
   "Hola, {fullName}" (o el email si fullName es null) con un botón "Salir".
4. Si responde 400/422 muestra el mensaje de error de la API debajo del formulario; si hay
   error de red, muestra "No se pudo conectar con el servidor".
5. Mientras la petición está en curso, el botón se deshabilita.
6. Al recargar la página con un token guardado, se llama a GET /api/v1/account/profile y se
   mantiene la sesión; si responde 401, se limpia el token y vuelve al formulario.
7. "Salir" llama a POST /api/v1/account/logout y limpia el token.

Fuera de alcance
- Registro de usuario, recuperación de contraseña, rutas protegidas, estilos más allá de lo mínimo.
- Cualquier cambio en backend/.

Notas técnicas
- La URL base de la API debe salir de import.meta.env.VITE_API_URL con fallback a http://localhost:3333.
- No añadir dependencias sin justificarlo en el plan.
- Debe pasar npm run build y npm run lint en frontend/.

Produce SOLO un plan de implementación, no escribas código ni crees archivos.
El plan debe tener: contexto verificado (endpoints reales con archivo:línea y reglas de validación
que aplican), tabla de archivos a tocar contados, archivos que NO se tocan y por qué, pasos de
implementación, convenciones del proyecto que aplican, comandos de verificación, y supuestos.
Termina con la línea: Plan listo. ¿Lo aplico?
```

**Qué salió:** plan completo a la primera (5 archivos) y detectó el envoltorio `{ data }`. Afirmó por error que el cliente tiene que mandar `Accept: application/json`, cuando el backend ya lo fuerza con un middleware.

## Prompt 15

**Modelo:** Opus 5 (1M context)
**Herramienta:** Claude Code, en la copia sin harness (`flowsync-sin-harness/`)

```
uarda el plan en ~/plan-sin-harness.md. Luego lanza también /priority-ticket FLOW-10 en la copia con harness si todavía no lo hiciste. Con los dos planes, rellena la columna, quita los PENDIENTE
```

**Qué salió:** guardó el plan. No volvió a lanzar `/priority-ticket`, porque ya se había lanzado (Prompt 1). Rellenó la columna «Sin harness» contrastándola con el plan con harness.
