import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task, TaskStatus, UpdateTaskPayload } from '@/lib/types'
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
  /** Hay un cambio de esta tarea esperando respuesta del servidor. */
  isPending: boolean
  onOpen: (id: number) => Promise<void>
  onUpdate: (task: Task, payload: UpdateTaskPayload) => Promise<void>
  onStatusChange: (task: Task, status: TaskStatus) => void
  onActionError: (message: string) => void
}

/**
 * Lo que se ve al «abrir» una tarea: su fecha de vencimiento, si está vencida y
 * su estado. El veredicto de vencida llega siempre del backend.
 */
function TaskPanel({
  task,
  isPending,
  onOpen,
  onUpdate,
  onStatusChange,
  onActionError,
}: TaskPanelProps) {
  const dateInput = useRef<HTMLInputElement>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const panelId = `task-panel-${task.id}`
  const dateId = `task-${task.id}-due-date`

  // Abrir la tarea la vuelve a leer: el panel enseña su estado actual, no el
  // que tenía cuando se cargó la lista.
  useEffect(() => {
    onOpen(task.id).catch((error: unknown) => {
      if (isSessionError(error)) onActionError(toMessage(error, ''))
      else setLoadError(toMessage(error, 'No se ha podido abrir la tarea.'))
    })
    // Solo al abrir: las actualizaciones posteriores llegan por la propia tarea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id])

  // El campo no es controlado (un día a medio escribir no tiene valor), así que
  // se alinea a mano con la fecha de la tarea cuando cambia desde fuera: al
  // quitarla, al revertir un error o al llegar datos frescos. No se toca
  // mientras la persona está escribiendo en él.
  useEffect(() => {
    const input = dateInput.current
    if (input && document.activeElement !== input) {
      input.value = task.dueDate ?? ''
    }
  }, [task.dueDate])

  const saveDueDate = async (dueDate: string | null) => {
    const previous = task.dueDate
    setDateError(null)

    try {
      await onUpdate(task, { dueDate })
    } catch (error) {
      // La tarea ya ha vuelto a su fecha anterior; el campo, si tenía el foco,
      // hay que devolverlo a mano.
      if (dateInput.current) dateInput.current.value = previous ?? ''
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
    }
  }

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, validity } = event.target

    // Un día a medio escribir no se envía: la fecha guardada sigue intacta.
    if (validity.badInput || !value) {
      setDateError(validity.badInput ? INVALID_DATE : null)
      if (!validity.badInput) event.target.value = task.dueDate ?? ''
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

      {/* Mientras un cambio espera respuesta, el veredicto de antes ya no vale y
          el nuevo solo lo puede dar el servidor: la señal se retira hasta entonces. */}
      {task.isOverdue && !isPending && (
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
            onChange={handleDateChange}
            onBlur={handleDateBlur}
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? `${dateId}-error` : undefined}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!task.dueDate}
            onClick={() => saveDueDate(null)}
          >
            Quitar fecha
          </Button>
          {isPending && (
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

/** Lo que un cambio pinta en pantalla antes de que conteste el servidor. */
const optimisticPatch = (payload: UpdateTaskPayload): Partial<Task> => ({
  ...(payload.status !== undefined && { status: payload.status }),
  ...(payload.dueDate !== undefined && { dueDate: payload.dueDate }),
})

export function TasksPage() {
  const { token } = useAuth()
  const { isSubmitting, formError, fieldErrors, submit, failWith } =
    useAuthForm(FIELDS)
  // `null` mientras la lista no ha llegado todavía.
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<number | null>(null)
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set())
  const [title, setTitle] = useState('')
  // Última versión de cada tarea que ha confirmado el servidor: es a la que se
  // vuelve si un cambio falla, en vez de al valor optimista que hubiera antes.
  const confirmed = useRef(new Map<number, Task>())
  // Número del último cambio lanzado por tarea, el del cambio cuya respuesta
  // está reflejada en `confirmed` y cuántos siguen en vuelo. Con ellos una
  // respuesta atrasada no pisa lo que la persona ha hecho después, y cuando ya
  // no queda nada en vuelo la pantalla muestra lo que de verdad hay guardado.
  const latestChange = useRef(new Map<number, number>())
  const confirmedChange = useRef(new Map<number, number>())
  const inFlight = useRef(new Map<number, number>())

  const replaceTask = (id: number, patch: Partial<Task>) =>
    setTasks(
      (current) =>
        current?.map((task) =>
          task.id === id ? { ...task, ...patch } : task,
        ) ?? current,
    )

  const acceptFromServer = (task: Task) => {
    confirmed.current.set(task.id, task)
    replaceTask(task.id, task)
  }

  const setPending = (id: number, isPending: boolean) =>
    setPendingIds((current) => {
      const next = new Set(current)
      if (isPending) next.add(id)
      else next.delete(id)
      return next
    })

  useEffect(() => {
    if (!token) return

    let cancelled = false

    api
      .listTasks(token)
      .then((list) => {
        if (cancelled) return
        for (const task of list) confirmed.current.set(task.id, task)
        setTasks(list)
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

  /** Relee una tarea al abrirla, salvo que alguien la haya cambiado mientras. */
  const refreshTask = async (id: number) => {
    if (!token) return
    const changeAtStart = latestChange.current.get(id) ?? 0
    const fresh = await api.getTask(token, id)
    const untouched =
      (latestChange.current.get(id) ?? 0) === changeAtStart &&
      !inFlight.current.get(id)
    if (untouched) {
      acceptFromServer(fresh)
    }
  }

  /**
   * Aplica un cambio de forma optimista y lo confirma con el servidor. Si falla,
   * la tarea vuelve a lo último confirmado y el error se propaga para que quien
   * llama explique el motivo.
   */
  const updateTask = async (task: Task, payload: UpdateTaskPayload) => {
    if (!token) return

    const id = task.id
    const change = (latestChange.current.get(id) ?? 0) + 1
    latestChange.current.set(id, change)
    inFlight.current.set(id, (inFlight.current.get(id) ?? 0) + 1)
    const isLatest = () => latestChange.current.get(id) === change
    const showConfirmed = () => {
      const last = confirmed.current.get(id)
      if (last) replaceTask(id, last)
    }

    setActionError(null)
    setPending(id, true)
    replaceTask(id, optimisticPatch(payload))

    try {
      const updated = await api.updateTask(token, id, payload)
      // El servidor aplica los cambios en orden: una respuesta más antigua que
      // la ya confirmada describe un estado que ya no existe.
      if (change > (confirmedChange.current.get(id) ?? 0)) {
        confirmed.current.set(id, updated)
        confirmedChange.current.set(id, change)
      }
      if (isLatest()) showConfirmed()
    } catch (error) {
      if (isLatest()) showConfirmed()
      throw error
    } finally {
      const remaining = (inFlight.current.get(id) ?? 1) - 1
      inFlight.current.set(id, remaining)
      if (remaining === 0) {
        showConfirmed()
        setPending(id, false)
      }
    }
  }

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
      confirmed.current.set(task.id, task)
      // La tarea nueva se pinta sin volver a pedir la lista entera.
      setTasks((current) => [...(current ?? []), task])
      setTitle('')
    })
  }

  const handleStatusChange = (task: Task, status: TaskStatus) =>
    updateTask(task, { status }).catch((error: unknown) =>
      setActionError(
        isSessionError(error)
          ? toMessage(error, '')
          : 'No se ha podido guardar el cambio de estado. Inténtalo de nuevo.',
      ),
    )

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

                    {isOpen && (
                      <div className="mt-3">
                        <TaskPanel
                          task={task}
                          isPending={pendingIds.has(task.id)}
                          onOpen={refreshTask}
                          onUpdate={updateTask}
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
