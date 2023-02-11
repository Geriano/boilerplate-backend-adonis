import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class LogoutController {
  public async process({ auth, response, i18n }: HttpContextContract) {
    await auth.use('api').revoke()

    return response.ok({
      message: i18n.formatMessage('messages.auth.logouted'),
    })
  }
}
