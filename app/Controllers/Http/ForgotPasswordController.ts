import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Encryption from '@ioc:Adonis/Core/Encryption'
import Event from '@ioc:Adonis/Core/Event'
import User from 'App/Models/User'
import { DateTime } from 'luxon'
import Database from '@ioc:Adonis/Lucid/Database'
import Mail from '@ioc:Adonis/Addons/Mail'

export default class ForgotPasswordController {
  /**
   * @swagger
   * /forgot-password:
   *  post:
   *    summary: Request reset password
   *    tags:
   *      - Authentication
   *    security:
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: payload
   *        in: body
   *        required: true
   *        schema:
   *          type: object
   *          properties:
   *            email:
   *              type: string
   *              example: root@local.app
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                message:
   *                  type: string
   *      419:
   *        description: PageExpired
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/PageExpired'
   *      422:
   *        description: Unprocessable Entity
   *        content:
   *          application/json:
   *            schema:
   *              type: array
   *              items:
   *                $ref: '#/components/schemas/ValidationError'
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async request({ request, response, i18n }: HttpContextContract) {
    const { email, next } = await request.validate({
      schema: schema.create({
        email: schema.string({ trim: true }, [
          rules.exists({
            table: User.table,
            column: 'email',
          }),
          rules.normalizeEmail({
            allLowercase: true,
          }),
        ]),
        next: schema.string({ trim: true }),
      }),
    })

    const user = await User.findByOrFail('email', email)
    const token = Encryption.encrypt({
      id: user.id,
      expired_at: DateTime.now().plus({ day: 1 }).toISO(),
    })

    await Mail.sendLater((message) => {
      message
        .from('info@boilerplate.js')
        .to(user.email)
        .subject('Email verification')
        .htmlView('emails/reset', {
          user,
          url: `${next}/reset?token=${token}`,
        })
    })

    return response.created({
      message: i18n.formatMessage('messages.auth.verification', {
        email: user.email,
      }),
    })
  }

  /**
   * @swagger
   * /forgot-password:
   *  put:
   *    summary: Reset password
   *    security:
   *      - csrf: []
   *    tags:
   *      - Authentication
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: payload
   *        in: body
   *        required: true
   *        schema:
   *          type: object
   *          properties:
   *            password:
   *              type: string
   *              example: password
   *            password_confirmation:
   *              type: string
   *              example: password
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                message:
   *                  type: string
   *      419:
   *        description: PageExpired
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/PageExpired'
   *      422:
   *        description: Unprocessable Entity
   *        content:
   *          application/json:
   *            schema:
   *              type: array
   *              items:
   *                $ref: '#/components/schemas/ValidationError'
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async reset({ request, response, i18n }: HttpContextContract) {
    const option = { trim: true }
    const { token, password } = await request.validate({
      schema: schema.create({
        token: schema.string(option),
        password: schema.string(option, [
          rules.minLength(8),
          rules.maxLength(255),
          rules.alphaNum(),
        ]),
        password_confirmation: schema.string(option, [
          rules.minLength(8),
          rules.maxLength(255),
          rules.alphaNum(),
          rules.confirmed('password'),
        ]),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      const decrypted = Encryption.decrypt(token) as {
        id: number
        expired_at: string
      } | null

      if (!decrypted) {
        return response.badRequest({
          message: i18n.formatMessage('messages.response.400.message'),
        })
      }

      const { id, expired_at: expiredAt } = decrypted

      const user = await User.findOrFail(id)
      const expired = new Date(expiredAt).getTime()

      if (new Date().getTime() >= expired) {
        const body = {
          message: i18n.formatMessage('messages.response.419.message'),
          description: i18n.formatMessage('messages.response.419.description'),
        }

        return response.abort(body, 419)
      }

      user.password = password
      await user.save()
      await transaction.commit()
      await Event.emit('user:reseted', user)

      return response.ok({
        message: i18n.formatMessage('messages.auth.reseted'),
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }
}
