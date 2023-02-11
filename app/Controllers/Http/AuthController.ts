import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Permission from 'App/Models/Permission'
import Role from 'App/Models/Role'

export default class AuthController {
  public async user({ auth, response }: HttpContextContract) {
    return response.ok(auth.user!)
  }

  public async hasPermission({ auth, request, response }: HttpContextContract) {
    const { permissions } = await request.validate({
      schema: schema.create({
        permissions: schema.array().members(
          schema.string({ trim: true }, [
            rules.exists({
              table: Permission.table,
              column: 'key',
            }),
          ])
        ),
      }),
    })

    return response.status(auth.user!.hasPermission(permissions) ? 200 : 401)
  }

  public async hasRole({ auth, request, response }: HttpContextContract) {
    const { roles } = await request.validate({
      schema: schema.create({
        roles: schema.array().members(
          schema.string({ trim: true }, [
            rules.exists({
              table: Role.table,
              column: 'key',
            }),
          ])
        ),
      }),
    })

    return response.status(auth.user!.hasRole(roles) ? 200 : 401)
  }

  public async can({ auth, request, response }: HttpContextContract) {
    const abilities = request.input('abilities')

    console.log(abilities)

    if (Array.isArray(abilities)) {
      return response.status(auth.user!.can(abilities) ? 200 : 401)
    }

    return response.status(401)
  }
}
