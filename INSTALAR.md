# Harness FlowSync — instalación en 8 piezas (mismo orden que el mentor)

Copia esta carpeta encima de tu clon **con remotos** (la copia de tratamiento). La copia
`flowsync-sin-harness/` no se toca en ningún paso.

```bash
# desde el directorio que contiene tu clon
cp -R flowsync-ai4devs flowsync-sin-harness          # copia control, antes de montar nada
rsync -a harness/ flowsync-ai4devs/                  # o cp -R harness/. flowsync-ai4devs/
cd flowsync-ai4devs
```

| # | Pieza | Archivo | Qué verificar |
|---|---|---|---|
| 1 | `CLAUDE.md` de `/init` | `CLAUDE.md` (sección arquitectura + convenciones) | Lanza `/init` en Claude Code; si genera uno, fusiónalo con este. Los hechos (rutas, 254/8/32, transformer) están sacados del código real. |
| 2 | MCP de Atlassian | `.mcp.json` | `claude mcp list` → `atlassian`. Primera vez pide OAuth. Prueba: "busca mis tickets en Por hacer". |
| 3 | Skills `/priority-ticket` y `/commit` | `.claude/skills/*/SKILL.md` | Escribe `/` en Claude Code y deben aparecer. |
| 4 | Subagente `adversarial-reviewer` | `.claude/agents/adversarial-reviewer.md` | `/agents` lo lista. |
| 5 | Hook Prettier frontend | `.claude/settings.json` + `.claude/hooks/format-frontend.sh` + `frontend/.prettierrc` | `cd frontend && npm i -D prettier`. Luego pide a Claude editar `src/App.tsx` con Edit y mira que aparezca `[hook] prettier: ...`. |
| 6 | Reglas de proceso | final de `CLAUDE.md` | 8 reglas numeradas. |
| 7 | `AGENTS.md` como enlace | `AGENTS.md -> CLAUDE.md` (symlink) | `ls -l AGENTS.md`. Si tu SO no respeta el symlink, `cp CLAUDE.md AGENTS.md`. |
| 8 | Plan mode + permisos | `.claude/settings.json` (`permissions`) | `backend/` y `.env` denegados a Edit/Write; `git commit` a mano denegado (solo vía `/commit`). Lanza `/priority-ticket` en **plan mode** (Shift+Tab). |

## Después

1. Crea el ticket en Jira con el texto de la lección, asignado a ti, en «Por hacer».
2. Copia con harness: `/priority-ticket FLOW-N` (o sin argumento).
3. Copia pelada: pega `docs/harness/prompt-sin-harness.md` con el texto del ticket dentro.
4. Rellena `docs/harness/comparacion.md` y `prompts.md` con lo que salió, sin maquillar.
5. Entrega: rama desde `s1/start` (no desde tu rama de trabajo) con **solo** `docs/harness/comparacion.md` y `prompts.md`.
   Ni el harness ni el código de la tarea van en el PR.

## Trampas conocidas de la cohorte (para la línea 3 de la Parte B)

- El hook `PostToolUse` solo salta con `Write|Edit`. Si el agente escribe con heredocs de Bash, no corre.
- El MCP puede tardar en autenticar; si `/priority-ticket` no ve el ticket, el plan sale de memoria y eso ya es un hallazgo.
- "No apliques el plan" está escrito en la skill y en CLAUDE.md; varias copias implementaron igualmente. Cuéntalo.
