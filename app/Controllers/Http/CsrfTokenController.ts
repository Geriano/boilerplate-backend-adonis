import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import CsrfToken from 'App/Models/CsrfToken'
import Encryption from '@ioc:Adonis/Core/Encryption'
import { DateTime } from 'luxon'
import { HttpContext } from '@adonisjs/core/build/standalone'

export default class CsrfTokenController {
  /**
   * @swagger
   * /csrf:
   *  post:
   *    summary: Generate csrf token
   *    tags:
   *      - CSRF
   *    produces:
   *      - application/json
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                token:
   *                  type: string
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async generate({ request, response }: HttpContextContract) {
    await CsrfToken.query()
      .where('ip', request.ip())
      .where('expired_at', '>=', DateTime.now().toISO())
      .where('used', false)
      .update({
        used: true,
      })

    const csrf = await CsrfToken.create({
      ip: request.ip(),
      expiredAt: DateTime.now().plus({ seconds: 30 }),
    })

    return response.created({
      token: Encryption.encrypt(csrf.serialize()),
    })
  }

  public async validate() {
    const { request } = HttpContext.get()!
    const token = request.header('x-csrf-token')

    if (!token) {
      return false
    }

    const decrypted = Encryption.decrypt(token) as {
      id: number
    }

    if (!decrypted) {
      return false
    }

    const csrf = await CsrfToken.find(decrypted.id)

    if (!csrf) {
      return false
    }

    const expiredAt = new Date(csrf.expiredAt.toString()).getTime()

    if (csrf.used || new Date().getTime() >= expiredAt) {
      return false
    }

    csrf.used = true
    await csrf.save()

    return true
  }
}
