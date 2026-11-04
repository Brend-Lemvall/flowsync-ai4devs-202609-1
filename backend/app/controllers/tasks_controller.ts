import Task from '#models/task'
import { createTaskValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { resolveReferenceDay } from '#services/reference_day'

export default class TasksController {
  /**
   * There is a single shared list, the same for everyone. No ordering is
   * applied on purpose: the ordering rule is still an open product decision.
   */
  async index({ request, serialize }: HttpContext) {
    const today = await resolveReferenceDay(request)
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks, today))
  }

  async show({ params, request, serialize }: HttpContext) {
    const today = await resolveReferenceDay(request)
    const task = await Task.query().where('id', params.id).preload('assignee').firstOrFail()

    return serialize(TaskTransformer.transform(task, today))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const today = await resolveReferenceDay(request)
    const { title, dueDate } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      dueDate: dueDate ?? null,
      assigneeId: auth.getUserOrFail().id,
    })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task, today))
  }

  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    // Resolved before saving: a malformed header must not apply the change.
    const today = await resolveReferenceDay(request)
    const { status, assigneeId, dueDate } = await request.validateUsing(updateTaskValidator)

    if (status !== undefined) task.status = status
    if (assigneeId !== undefined) task.assigneeId = assigneeId
    // `null` removes the date; `undefined` leaves it untouched.
    if (dueDate !== undefined) task.dueDate = dueDate
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, today))
  }
}
