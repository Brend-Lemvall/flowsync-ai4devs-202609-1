import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class TaskTransformer extends BaseTransformer<Task> {
  /**
   * `today` is the reference day (`YYYY-MM-DD`) of whoever is asking: the
   * overdue verdict depends on it, so it's computed on every read and never
   * stored. Pass it as `TaskTransformer.transform(tasks, today)`.
   */
  constructor(
    resource: Task,
    protected today: string
  ) {
    super(resource)
  }

  /**
   * The list only needs to know who the assignee is, so only their id and
   * name are exposed: never the email or any other account data.
   */
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      assignee: this.pick(this.resource.assignee, ['id', 'fullName']),
      dueDate: this.resource.dueDate?.toISODate() ?? null,
      isOverdue: this.resource.isOverdueOn(this.today),
    }
  }
}
