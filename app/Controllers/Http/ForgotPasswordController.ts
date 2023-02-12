import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Encryption from '@ioc:Adonis/Core/Encryption'
import Event from '@ioc:Adonis/Core/Event'
import User from 'App/Models/User'
import { DateTime } from 'luxon'
import Database from '@ioc:Adonis/Lucid/Database'

export default class ForgotPasswordController {
  public async request({ request, response }: HttpContextContract) {
    const { email } = await request.validate({
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
      }),
    })

    const user = await User.findByOrFail('email', email)
    const token = {
      id: user.id,
      expired_at: DateTime.now().plus({ day: 1 }).toISO(),
    }

    return response.created({
      token: Encryption.encrypt(token),
    })
  }

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
