import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'
import { useAuth } from '@/auth/use-auth'
import { useAuthForm } from '@/auth/use-auth-form'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const FIELDS = ['title'] as const

/** Los identificadores viajan en inglés; en pantalla solo existen estos nombres. */
const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]

const INVALID_DATE = 'Introduce una fecha completa y válida.'

const toMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback

const isSessionError = (error: unknown) =>
  error instanceof ApiError && error.status === 401

/** El mismo selector en la fila y en el panel, para que no puedan divergir. */
function StatusSelect({
  task,
  onChange,
}: {
  task: Task
  onChange: (task: Task, status: TaskStatus) => void
}) {
  return (
    <select
      aria-label={`Estado de «${task.title}»`}
      value={task.status}
      onChange={(event) => onChange(task, event.target.value as TaskStatus)}
      className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 shrink-0 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
    >
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  )
}

type TaskPanelProps = {
  task: Task
  token: string
  onTaskUpdated: (task: Task) => void
  onStatusChange: (task: Task, status: TaskStatus) => void
  onActionError: (message: string) => void
}

/**
 * Lo que se ve al «abrir» una tarea: su fecha de vencimiento, si está vencida y
 * su estado. El veredicto de vencida llega siempre del backend.
 */
function TaskPanel({
  task,
  token,
  onTaskUpdated,
  onStatusChange,
  onActionError,
}: TaskPanelProps) {
  const dateInput = useRef<HTMLInputElement>(null)
  const [isSaving, setSaving] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const panelId = `task-panel-${task.id}`
  const dateId = `task-${task.id}-due-date`

  // Abrir la tarea la vuelve a leer: el panel enseña su estado actual, no el
  // que tenía cuando se cargó la lista.
  useEffect(() => {
    let cancelled = false

    api
      .getTask(token, task.id)
      .then((fresh) => {
        if (!cancelled) onTaskUpdated(fresh)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (isSessionError(error)) onActionError(toMessage(error, ''))
        else setLoadError(toMessage(error, 'No se ha podido abrir la tarea.'))
      })

    return () => {
      cancelled = true
    }
    // Solo al abrir: las actualizaciones posteriores ya llegan por `onTaskUpdated`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, token])

  /** Devuelve el campo a la última fecha guardada. */
  const restoreDateInput = () => {
    if (dateInput.current) dateInput.current.value = task.dueDate ?? ''
  }

  // Sin actualización optimista: ante un error hay que conservar la fecha
  // anterior, y el veredicto de vencida solo lo puede dar la respuesta.
  const saveDueDate = async (dueDate: string | null) => {
    setSaving(true)
    setDateError(null)

    try {
      onTaskUpdated(await api.updateTask(token, task.id, { dueDate }))
    } catch (error) {
      restoreDateInput()
      if (isSessionError(error)) {
        onActionError(toMessage(error, ''))
      } else if (error instanceof ApiError && error.status === 422) {
        setDateError(INVALID_DATE)
      } else {
        setDateError(
          toMessage(
            error,
            'No se ha podido guardar la fecha. Inténtalo de nuevo.',
          ),
        )
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, validity } = event.target

    // Un día a medio escribir no se envía: la fecha guardada sigue intacta.
    if (validity.badInput || !value) {
      setDateError(validity.badInput ? INVALID_DATE : null)
      if (!validity.badInput) restoreDateInput()
      return
    }

    void saveDueDate(value)
  }

  // Si se sale del campo con el día incompleto no hay evento `change` (el valor
  // sigue vacío), así que el aviso se da al perder el foco.
  const handleDateBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (event.target.validity.badInput) setDateError(INVALID_DATE)
  }

  return (
    <div id={panelId} className="grid gap-4 border-t pt-4 pb-1">
      {loadError && (
        <p className="text-destructive text-sm" role="alert">
          {loadError}
        </p>
      )}

      {task.isOverdue && (
        <p
          className="text-destructive flex items-center gap-1.5 text-sm font-medium"
          role="status"
        >
          <AlertCircleIcon className="size-4" aria-hidden="true" />
          Vencida
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor={dateId}>Fecha de vencimiento</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            ref={dateInput}
            id={dateId}
            type="date"
            className="w-auto"
            defaultValue={task.dueDate ?? ''}
            key={task.dueDate ?? 'sin-fecha'}
            disabled={isSaving}
            onChange={handleDateChange}
            onBlur={handleDateBlur}
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? `${dateId}-error` : undefined}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isSaving || !task.dueDate}
            onClick={() => saveDueDate(null)}
          >
            Quitar fecha
          </Button>
          {isSaving && (
            <Loader2Icon
              className="text-muted-foreground size-4 animate-spin self-center"
              aria-label="Guardando…"
            />
          )}
        </div>
        <FieldError id={`${dateId}-error`} message={dateError ?? undefined} />
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Estado</span>
        <div>
          <StatusSelect task={task} onChange={onStatusChange} />
        </div>
      </div>
    </div>
  )
}

export function TasksPage() {
  const { token } = useAuth()
  const { isSubmitting, formError, fieldErrors, submit, failWith } =
    useAuthForm(FIELDS)
  // `null` mientras la lista no ha llegado todavía.
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<number | null>(null)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!token) return

    let cancelled = false

    api
      .listTasks(token)
      .then((list) => {
        if (!cancelled) setTasks(list)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(toMessage(error, 'No se han podido cargar las tareas.'))
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const replaceTask = (id: number, patch: Partial<Task>) =>
    setTasks(
      (current) =>
        current?.map((task) =>
          task.id === id ? { ...task, ...patch } : task,
        ) ?? current,
    )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    // Un título de solo espacios no cuenta como título. El backend lo rechaza
    // igualmente; aquí se evita el viaje y se da el mensaje en lenguaje corriente.
    if (!title.trim()) {
      failWith('title', 'Falta rellenar el título.')
      return
    }

    return submit(async () => {
      if (!token) return
      const task = await api.createTask(token, { title })
      // La tarea nueva se pinta sin volver a pedir la lista entera.
      setTasks((current) => [...(current ?? []), task])
      setTitle('')
    })
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (!token) return

    const previous = task.status
    setActionError(null)
    // Optimista: el cambio se ve al instante y se deshace si el backend falla.
    // La respuesta trae además el veredicto de vencida recalculado.
    replaceTask(task.id, { status })

    try {
      const updated = await api.updateTask(token, task.id, { status })
      replaceTask(task.id, updated)
    } catch (error) {
      replaceTask(task.id, { status: previous })
      setActionError(
        isSessionError(error)
          ? toMessage(error, '')
          : 'No se ha podido guardar el cambio de estado. Inténtalo de nuevo.',
      )
    }
  }

  const toggleTask = (id: number) =>
    setOpenTaskId((current) => (current === id ? null : id))

  const alertMessage = formError ?? actionError

  return (
    <div className="bg-muted/40 flex min-h-svh justify-center p-6">
      <Card className="h-fit w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Tareas del equipo</CardTitle>
              <CardDescription>
                Quién está en qué, de un vistazo.
              </CardDescription>
            </div>
            <Link
              to="/profile"
              className="text-muted-foreground hover:text-foreground shrink-0 text-sm underline"
            >
              Mi perfil
            </Link>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6">
          <form onSubmit={handleSubmit} className="grid gap-2" noValidate>
            <Label htmlFor="title">Nueva tarea</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                name="title"
                placeholder="¿En qué estás trabajando?"
                autoComplete="off"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? 'title-error' : undefined}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando…' : 'Crear tarea'}
              </Button>
            </div>
            <FieldError id="title-error" message={fieldErrors.title} />
          </form>

          {alertMessage && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{alertMessage}</AlertDescription>
            </Alert>
          )}

          {loadError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : tasks === null ? (
            <div
              className="text-muted-foreground flex items-center gap-2 text-sm"
              role="status"
            >
              <Loader2Icon className="size-4 animate-spin" />
              Cargando tareas…
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm">
              <p className="font-medium">Todavía no hay ninguna tarea.</p>
              <p className="text-muted-foreground mt-1">
                Esta es la lista compartida del equipo: aquí verá todo el mundo
                quién lleva cada tarea y en qué estado está. Escribe un título
                arriba para crear la primera.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {tasks.map((task) => {
                const isOpen = openTaskId === task.id

                return (
                  <li key={task.id} className="py-3">
                    {/* La fila cerrada no enseña ni la fecha ni la marca de vencida. */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          aria-expanded={isOpen}
                          aria-controls={`task-panel-${task.id}`}
                          className="focus-visible:ring-ring/50 rounded-sm text-left font-medium break-words outline-none hover:underline focus-visible:ring-[3px]"
                        >
                          {task.title}
                        </button>
                        <p className="text-muted-foreground text-sm">
                          {task.assignee.fullName ?? 'Sin nombre'}
                        </p>
                      </div>
                      <StatusSelect task={task} onChange={handleStatusChange} />
                    </div>

                    {isOpen && token && (
                      <div className="mt-3">
                        <TaskPanel
                          task={task}
                          token={token}
                          onTaskUpdated={(fresh) =>
                            replaceTask(fresh.id, fresh)
                          }
                          onStatusChange={handleStatusChange}
                          onActionError={setActionError}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
