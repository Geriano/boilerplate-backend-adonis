import Mail from '@ioc:Adonis/Addons/Mail'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Encryption from '@ioc:Adonis/Core/Encryption'
import Env from '@ioc:Adonis/Core/Env'
import Event from '@ioc:Adonis/Core/Event'
import User from 'App/Models/User'
import { DateTime } from 'luxon'

export default class RegisterController {
  /**
   * @swagger
   * /register:
   *  post:
   *    summary: Register
   *    security:
   *      - csrf: []
   *    tags:
   *      - Authentication
   *    requestBody:
   *      required: true
   *      content:
   *        multipart/form-data:
   *          schema:
   *            type: object
   *            properties:
   *              name:
   *                type: string
   *                required: true
   *                example: root
   *              email:
   *                type: string
   *                required: true
   *                example: root
   *              username:
   *                type: string
   *                required: true
   *                example: root
   *              password:
   *                type: string
   *                required: true
   *                example: password
   *              password_confirmation:
   *                type: string
   *                required: true
   *                example: password
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
   *                user:
   *                  $ref: '#/components/schemas/User'
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
  public async process({ request, response, i18n }: HttpContextContract) {
    const option = { trim: true }
    const { name, email, username, password, next } = await request.validate({
      schema: schema.create({
        name: schema.string(option),
        email: schema.string(option, [
          rules.normalizeEmail({
            allLowercase: true,
          }),
          rules.email(),
          rules.unique({
            table: User.table,
            column: 'email',
          }),
        ]),
        username: schema.string(option, [
          rules.unique({
            table: User.table,
            column: 'username',
          }),
          rules.minLength(2),
          rules.maxLength(64),
        ]),
        password: schema.string(option, [
          rules.maxLength(255),
          rules.minLength(8),
          rules.alphaNum(),
        ]),
        password_confirmation: schema.string(option, [
          rules.maxLength(255),
          rules.minLength(8),
          rules.alphaNum(),
          rules.confirmed('password'),
        ]),
        next: schema.string(option),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      const user = await User.create({
        name,
        email,
        username,
        password,
      })

      await this.send(user, next)
      await transaction.commit()

      return response.created({
        message: i18n.formatMessage('messages.auth.verification', {
          email: user.email,
        }),
        user,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async send(user: User, host: string | undefined = undefined) {
    const token = Encryption.encrypt({
      id: user.id,
      expired_at: DateTime.now().plus({ day: 1 }).toISO(),
    })

    if (!host) {
      host = `http://${Env.get('HOST')}:${Env.get('PORT')}`
    }

    await Mail.sendLater((message) => {
      message
        .from('info@boilerplate.js')
        .to(user.email)
        .subject('Email verification')
        .htmlView('emails/verify', {
          user,
          url: `${host}/verify?token=${token}`,
        })
    })
  }

  /**
   * @swagger
   * /verify:
   *  get:
   *    summary: Verify user email
   *    tags:
   *      - Authentication
   *    security:
   *      - csrf: []
   *    parameters:
   *      - name: token
   *        in: query
   *        required: true
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
  public async verify({ request, response, i18n }: HttpContextContract) {
    const { token } = request.qs() as {
      token: string
    }

    if (!token) {
      return response.badRequest()
    }

    const transaction = await Database.beginGlobalTransaction()

    try {
      const { id, expired_at: expiredAt } = Encryption.decrypt(token) as {
        id: number
        expired_at: string
      }

      const user = await User.findOrFail(id)

      const expired = new Date(expiredAt).getTime()

      if (new Date().getTime() >= expired) {
        const body = {
          message: i18n.formatMessage('messages.response.419.message'),
          description: i18n.formatMessage('messages.response.419.description'),
        }

        await this.send(user)

        return response.abort(body, 419)
      }

      user.emailVerifiedAt = DateTime.now()
      await user.save()
      await transaction.commit()
      await Event.emit('user:registered', user)

      return response.ok({
        message: i18n.formatMessage('messages.auth.verified'),
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }
}
