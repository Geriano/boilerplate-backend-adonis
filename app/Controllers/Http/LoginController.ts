import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Event from '@ioc:Adonis/Core/Event'
import Hash from '@ioc:Adonis/Core/Hash'
import User from 'App/Models/User'

export default class LoginController {
  /**
   * @swagger
   * /login:
   *  post:
   *    summary: Login
   *    security:
   *      - csrf: []
   *    tags:
   *      - Authentication
   *    produces:
   *      - application/json
   *    requestBody:
   *      required: true
   *      content:
   *        multipart/form-data:
   *          schema:
   *            type: object
   *            properties:
   *              username:
   *                type: string
   *                required: true
   *                example: root
   *              password:
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
   *                type:
   *                  type: string
   *                token:
   *                  type: string
   *                expires_at:
   *                  type: string
   *                  example: 2023-06-17 17:39:00
   *                expires_in:
   *                  type: string
   *                user:
   *                  $ref: '#/components/schemas/User'
   *        419:
   *          description: PageExpired
   *          content:
   *            application/json:
   *              schema:
   *                $ref: '#/components/schemas/PageExpired'
   *        422:
   *          description: Unprocessable Entity
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: '#/components/schemas/ValidationError'
   *        500:
   *          description: Internal Server Error
   *          content:
   *            application/json:
   *              schema:
   *                $ref: '#/components/schemas/InternalServerError'
   */
  public async process({ auth, i18n, request, response }: HttpContextContract) {
    const option = { trim: true }
    const { username, password } = await request.validate({
      schema: schema.create({
        username: schema.string(option, [
          rules.exists({
            table: User.table,
            column: 'username',
          }),
        ]),
        password: schema.string(option, [
          rules.maxLength(255),
          rules.minLength(8),
          rules.alphaNum(),
        ]),
      }),
    })

    const user = await User.findByOrFail('username', username)

    if (!user.emailVerifiedAt) {
      return response.forbidden({
        message: i18n.formatMessage('messages.auth.login.not verified'),
      })
    }

    if (await Hash.verify(user.password, password)) {
      const { type, token, expiresAt, expiresIn } = await auth.attempt(username, password, {
        expiresIn: '3 day',
      })

      await Event.emit('user:login', user)

      return response.ok({
        message: i18n.formatMessage('messages.auth.login.authenticated'),
        type,
        token,
        expires_at: expiresAt,
        expires_in: expiresIn,
        user,
      })
    }

    return response.unprocessableEntity({
      errors: [
        {
          field: 'password',
          message: i18n.formatMessage('messages.auth.login.wrong password'),
        },
      ],
    })
  }
}
