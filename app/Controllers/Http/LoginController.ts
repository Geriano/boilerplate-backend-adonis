import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Event from '@ioc:Adonis/Core/Event'
import Hash from '@ioc:Adonis/Core/Hash'
import User from 'App/Models/User'

export default class LoginController {
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

    if (await Hash.verify(user.password, password)) {
      const { type, token, expiresAt, expiresIn } = await auth.attempt(username, password, {
        expiresIn: '3 day',
      })

      await Event.emit('login', user)

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
