import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class HasPermission {
  public async handle(
    { auth, response }: HttpContextContract,
    next: () => Promise<void>,
    guards: string[]
  ) {
    const user = await auth.authenticate()

    if (!user.hasPermission(guards)) {
      return response.unauthorized()
    }

    await next()
  }
}
