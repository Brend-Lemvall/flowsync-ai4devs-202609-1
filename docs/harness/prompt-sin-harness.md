# Instrucción para la copia pelada (flowsync-sin-harness/)

Es la misma instrucción que lleva `/priority-ticket`, escrita a mano, sin CLAUDE.md, sin MCP,
sin skills ni hooks. Pégala tal cual en Claude Code dentro de `flowsync-sin-harness/`.
Después cópiala también a `prompts.md`.

```
Este es el ticket de Jira que tengo que implementar:

<pega aquí la clave, el título y el texto completo del ticket "Implementar login en el frontend">

Produce SOLO un plan de implementación, no escribas código ni crees archivos.
El plan debe tener: contexto verificado (endpoints reales con archivo:línea y reglas de validación
que aplican), tabla de archivos a tocar contados, archivos que NO se tocan y por qué, pasos de
implementación, convenciones del proyecto que aplican, comandos de verificación, y supuestos.
Termina con la línea: Plan listo. ¿Lo aplico?
```
