import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class AuthController {
  public async user({ auth, response }: HttpContextContract) {
    return response.ok(auth.user!)
  }
}
