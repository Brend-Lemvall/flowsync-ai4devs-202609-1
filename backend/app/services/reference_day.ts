import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * The client tells us which day it is for them, so the overdue verdict
 * follows the timezone of whoever is looking.
 */
const referenceDayValidator = vine.create({
  'x-client-date': vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
})

/**
 * Resolves the reference day (`YYYY-MM-DD`) from the `X-Client-Date` header.
 * Falls back to the current UTC day when the header is missing, and rejects
 * a malformed one with the usual 422 validation error.
 */
export async function resolveReferenceDay(request: HttpContext['request']) {
  const { 'x-client-date': clientDate } = await referenceDayValidator.validate({
    'x-client-date': request.header('x-client-date'),
  })

  return clientDate?.toISODate() ?? DateTime.utc().toISODate()
}
