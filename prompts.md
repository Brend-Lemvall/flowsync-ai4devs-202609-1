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

<!--
PENDIENTE: los prompts con los que montaste el harness (CLAUDE.md con /init, MCP de Atlassian,
skills /priority-ticket y /commit, subagente adversarial-reviewer, hook de Prettier, reglas de
proceso, AGENTS.md) no están en esta sesión ni en la memoria de Claude Code: la única
transcripción local de este proyecto empieza en el Prompt 1 de abajo. Si los lanzaste en otra
herramienta u otra máquina, pégalos antes del Prompt 1 y renumera. Borra este comentario después.
-->

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

**Modelo:** — (PENDIENTE: no consta; pon el que usaste)
**Herramienta:** Claude Code, en la copia sin harness (`flowsync-sin-harness/`)

<!--
PENDIENTE: copiado literal de docs/harness/prompt-sin-harness.md. No hay transcripción de Claude
Code para flowsync-sin-harness/ en esta máquina, así que no consta que se lanzara ni cuándo.
Si lo lanzaste: sustituye la línea <pega aquí ...> por el ticket exactamente como lo pegaste,
pon el modelo y muévelo a su posición real en el orden. Si no lo lanzaste, borra este apartado.
-->

```
Este es el ticket de Jira que tengo que implementar:

<pega aquí la clave, el título y el texto completo del ticket "Implementar login en el frontend">

Produce SOLO un plan de implementación, no escribas código ni crees archivos.
El plan debe tener: contexto verificado (endpoints reales con archivo:línea y reglas de validación
que aplican), tabla de archivos a tocar contados, archivos que NO se tocan y por qué, pasos de
implementación, convenciones del proyecto que aplican, comandos de verificación, y supuestos.
Termina con la línea: Plan listo. ¿Lo aplico?
```
