#!/usr/bin/env bash
# PostToolUse hook: formatea con Prettier cualquier archivo de frontend/ que Claude
# escriba o edite con las herramientas Write/Edit.
#
# OJO (lección de la cohorte): este hook SOLO se dispara con Write/Edit. Si el agente
# escribe archivos con `cat > f <<EOF` desde Bash, el hook no corre. Míralo en la
# comparación: es un caso clásico de "lo dejé en el harness y no se cumplió".
set -euo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | node -e '
  let d = ""; process.stdin.on("data", c => d += c);
  process.stdin.on("end", () => {
    try { process.stdout.write(JSON.parse(d).tool_input?.file_path ?? "") } catch { process.stdout.write("") }
  })')

[ -z "$FILE" ] && exit 0
case "$FILE" in
  */frontend/*|frontend/*) ;;
  *) exit 0 ;;
esac
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.css|*.json) ;;
  *) exit 0 ;;
esac

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PRETTIER="$ROOT/frontend/node_modules/.bin/prettier"
[ -x "$PRETTIER" ] || PRETTIER="$ROOT/backend/node_modules/.bin/prettier"
[ -x "$PRETTIER" ] || { echo "[hook] prettier no encontrado; instala prettier en frontend/ (npm i -D prettier)" >&2; exit 0; }

"$PRETTIER" --write "$FILE" >/dev/null 2>&1 && echo "[hook] prettier: $FILE"
exit 0
