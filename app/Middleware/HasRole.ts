import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class HasRole {
  public async handle(
    { auth, response }: HttpContextContract,
    next: () => Promise<void>,
    guards: string[]
  ) {
    const user = await auth.authenticate()

    if (!user.hasRole(guards)) {
      return response.unauthorized()
    }

    await next()
  }
}
