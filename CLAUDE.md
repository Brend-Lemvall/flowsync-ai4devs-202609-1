# FlowSync

Gestión de tareas en equipo. Monorepo con dos apps independientes, cada una con su propio `package.json`:

- `backend/` — API REST en **AdonisJS 7** (TypeScript, Lucid, VineJS). Arranca en `http://localhost:3333`.
- `frontend/` — **React 19 + Vite 8 + TypeScript ~6**. Arranca en `http://localhost:5173`.

## Comandos

```bash
# backend
cd backend && npm install && cp .env.example .env && node ace generate:key && node ace migration:run
npm run dev        # servidor con HMR
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run format     # prettier --write .
npm test           # node ace test (Japa)

# frontend
cd frontend && npm install
npm run dev
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

## Arquitectura del backend (leer antes de proponer nada)

- Rutas en `backend/start/routes.ts`, todas bajo el prefijo `/api/v1`:
  - `POST /api/v1/auth/signup` → `NewAccountController.store`
  - `POST /api/v1/auth/login` → `AccessTokensController.store` — devuelve `{ user, token }`
  - `GET  /api/v1/account/profile` → `ProfileController.show` (requiere `Authorization: Bearer <token>`)
  - `POST /api/v1/account/logout` → `AccessTokensController.destroy`
- Auth por **access tokens opacos** (`@adonisjs/auth`, `DbAccessTokensProvider`), no JWT ni sesión de cookie.
- **Fuente de verdad de las validaciones:** `backend/app/validators/user.ts`.
  Email `maxLength(254)`; password `minLength(8).maxLength(32)` en signup. En login el password solo exige ser string.
  El frontend NO inventa reglas distintas a estas.
- El usuario serializado sale de `backend/app/transformers/user_transformer.ts`: `id, fullName, email, createdAt, updatedAt, initials`.
- Alias de imports con `#`: `#models/*`, `#validators/*`, `#controllers/*`, etc. (ver `imports` en `backend/package.json`).
- CORS abierto a cualquier origen en desarrollo (`backend/config/cors.ts`).

## Arquitectura del frontend

- Scaffold de Vite todavía: `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`.
- **No hay** router, ni cliente HTTP, ni gestor de estado, ni librería de formularios. Usa `fetch` nativo y estado de React antes de proponer añadir dependencias; si crees que hace falta una, dilo en el plan y justifícalo.
- Lint con **oxlint** (`.oxlintrc.json`): `react/rules-of-hooks` es error.

## Convenciones de código

- Estilo Prettier heredado de `@adonisjs/prettier-config` y aplicado también al frontend (`frontend/.prettierrc`):
  **sin punto y coma**, **comillas simples**, `printWidth: 100`, `trailingComma: es5`, `arrowParens: always`, 2 espacios.
- TypeScript estricto. Nada de `any`. Tipar las respuestas de la API con un `type` local que refleje el transformer.
- Nombres de archivo del backend en `snake_case.ts` (convención Adonis). Componentes del frontend en `PascalCase.tsx`; hooks `useAlgo.ts`.
- Commits en **Conventional Commits** en minúsculas: `feat(frontend): ...`, `fix(backend): ...`, `docs: ...`, `chore: ...`.
- No se commitean `.env`, `tmp/`, ni `node_modules/`.

## Reglas de proceso

1. **Ticket primero.** Toda tarea empieza con un ticket de Jira. Léelo con el MCP de Atlassian antes de tocar código y cita su clave en el plan y en el commit.
2. **Plan antes que código.** Para cualquier cambio que toque más de un archivo, primero un plan (archivos a tocar, contados, y por qué). No se implementa hasta que el plan se apruebe explícitamente.
3. **`backend/` es de solo lectura en tareas de frontend.** Si el frontend necesita algo que la API no da, se propone en el plan como ticket aparte, no se parchea el backend "de paso".
4. **Verificación antes de dar por hecho.** Antes de decir que algo está terminado: `npm run typecheck` (backend) o `npm run build` (frontend) y `npm run lint` en el paquete tocado. Pega la salida, no la resumas.
5. **Revisión adversarial.** Antes de cualquier commit que toque código, pasa el diff por el subagente `adversarial-reviewer` y atiende (o rebate por escrito) cada hallazgo.
6. **Commits solo con `/commit`.** Nunca `git commit` a mano ni `git push --force`. Nunca commits sobre `main` ni `s1/start`.
7. **No inventes.** Si una ruta, un campo o una regla de validación no está en el código, no existe. Si tienes que suponer algo, escríbelo como "SUPUESTO:" en el plan.
8. **Sin `Co-Authored-By` inventados ni firmas de terceros.** El autor es quien ejecuta.
