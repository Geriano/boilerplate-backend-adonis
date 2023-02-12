import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import CsrfTokenController from 'App/Controllers/Http/CsrfTokenController'

export default class ValidateCsrfToken {
  private methods = ['POST', 'PUT', 'PATCH', 'DELETE']

  private except = ['/csrf']

  public async handle({ request, response, i18n }: HttpContextContract, next: () => Promise<void>) {
    const controller = new CsrfTokenController()

    if (this.methods.includes(request.method().toUpperCase())) {
      const passed = await controller.validate()

      if (!passed) {
        if (!this.except.includes(request.url())) {
          return response.abort(
            {
              message: i18n.formatMessage('messages.response.419.message'),
            },
            419
          )
        }
      }
    }

    await next()
  }
}
