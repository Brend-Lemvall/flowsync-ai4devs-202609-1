import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import { TASK_STATUSES } from '#models/task'

/**
 * Trim runs before minLength so a whitespace-only title is rejected
 * just like an empty one.
 */
const title = () => vine.string().trim().minLength(1).maxLength(255)

/**
 * Calendar date with no time or zone. Impossible days (2026-02-30) and
 * timestamps are rejected.
 */
const dueDate = () => vine.date({ formats: ['YYYY-MM-DD'] })

/**
 * Requires at least one of the given keys to be present in the object.
 * Unlike `requiredIfMissing`, an explicit `null` counts as present: that's
 * how a due date is removed.
 */
const atLeastOneOf = vine.createRule((value: unknown, keys: string[], field: FieldContext) => {
  const body = (value ?? {}) as Record<string, unknown>
  if (keys.every((key) => body[key] === undefined)) {
    field.report(`Send at least one of: ${keys.join(', ')}`, 'atLeastOneOf', field)
  }
})

/**
 * Validator to use when creating a task. Only the title and an optional due
 * date are accepted: any other key in the body (status, assigneeId,
 * isOverdue...) is dropped.
 */
export const createTaskValidator = vine.create({
  title: title(),
  dueDate: dueDate().optional(),
})

/**
 * Validator to use when updating a task. The body must carry at least one
 * admitted change; the title can't be changed through this path, and
 * `dueDate: null` removes the date.
 */
export const updateTaskValidator = vine.create(
  vine
    .object({
      status: vine.enum(TASK_STATUSES).optional(),
      assigneeId: vine.number().exists({ table: 'users', column: 'id' }).optional(),
      dueDate: dueDate().nullable().optional(),
    })
    .use(atLeastOneOf(['status', 'assigneeId', 'dueDate']))
)
