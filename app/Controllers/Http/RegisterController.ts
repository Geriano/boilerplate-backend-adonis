import Mail from '@ioc:Adonis/Addons/Mail'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Encryption from '@ioc:Adonis/Core/Encryption'
import User from 'App/Models/User'
import { DateTime } from 'luxon'

export default class RegisterController {
  public async process({ request, response, i18n }: HttpContextContract) {
    const option = { trim: true }
    const { name, email, username, password } = await request.validate({
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
          rules.equalTo('password'),
        ]),
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

      const token = Encryption.encrypt({
        id: user.id,
        expired_at: DateTime.now().plus({ day: 1 }).toISO(),
      })

      await Mail.sendLater((message) => {
        message
          .from('info@boilerplate.js')
          .to(user.email)
          .subject('Email verification')
          .htmlView('emails/verify', {
            user,
            url: `http://localhost:3333/verify?token=${token}`,
          })
      })

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
}
