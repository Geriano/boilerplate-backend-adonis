import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class Can {
  public async handle(
    { auth, response }: HttpContextContract,
    next: () => Promise<void>,
    guards: string[]
  ) {
    const user = await auth.authenticate()

    if (!user.can(guards)) {
      return response.unauthorized()
    }

    await next()
  }
}
