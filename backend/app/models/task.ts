import { TaskSchema } from '#database/schema'
import User from '#models/user'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Conjunto cerrado de estados. Son los identificadores que viajan por la API;
 * los nombres en castellano solo existen en la interfaz.
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export default class Task extends TaskSchema {
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  /**
   * La columna tiene default en la BD, pero el modelo no lo conoce tras el
   * insert: sin esto, la tarea recién creada se serializaría sin `status`.
   */
  @beforeCreate()
  static assignDefaultStatus(task: Task) {
    task.status ??= 'pending'
  }

  /**
   * Única fuente de la regla de vencimiento: tiene fecha, esa fecha es
   * estrictamente anterior al día de referencia y la tarea no está hecha.
   * Se compara como texto `YYYY-MM-DD`, cuyo orden coincide con el
   * cronológico, para no mezclar zonas horarias. Nunca se persiste.
   */
  isOverdueOn(today: string) {
    const due = this.dueDate?.toISODate()
    if (!due) return false
    return due < today && this.status !== 'done'
  }
}
