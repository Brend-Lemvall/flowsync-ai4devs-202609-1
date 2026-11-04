/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

/** Identificadores de estado tal y como viajan por la API. */
export type TaskStatus = 'pending' | 'in_progress' | 'done'

/**
 * Espejo de `TaskTransformer` del backend: del responsable solo llega su id y
 * su nombre, nunca el email. `isOverdue` lo decide el backend según el día que
 * manda el cliente; aquí nunca se calcula.
 */
export type Task = {
  id: number
  title: string
  status: TaskStatus
  assignee: { id: number; fullName: string | null }
  /** Fecha de calendario `YYYY-MM-DD`, sin hora, o `null` si no tiene. */
  dueDate: string | null
  isOverdue: boolean
}

export type CreateTaskPayload = {
  title: string
}

export type UpdateTaskPayload = {
  status?: TaskStatus
  assigneeId?: number
  /** `null` quita la fecha; si la clave no viaja, la fecha no se toca. */
  dueDate?: string | null
}

export type LoginPayload = {
  email: string
  password: string
}
