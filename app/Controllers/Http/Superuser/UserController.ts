import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Env from '@ioc:Adonis/Core/Env'
import User from 'App/Models/User'
import Role from 'App/Models/Role'
import Permission from 'App/Models/Permission'

export default class UserController {
  public async paginate({ request, response }: HttpContextContract) {
    const { page, limit, search, order } = await request.validate({
      schema: schema.create({
        page: schema.number(),
        limit: schema.number(),
        search: schema.string.optional(),
        order: schema.object().members({
          dir: schema.enum(['asc', 'desc']),
          key: schema.enum(['name', 'email', 'username']),
        }),
      }),
    })

    try {
      return response.ok(
        await User.query()
          .where((query) => {
            const s = `%${search || ''}%`
            query.orWhereILike('name', s).orWhereILike('email', s).orWhereILike('username', s)
          })
          .orderBy(order.key, order.dir as 'asc' | 'desc')
          .preload('permissions', (query) => query.select(['id', 'name', 'key']))
          .preload('roles', (query) => query.select(['id', 'name', 'key']))
          .paginate(page, limit)
      )
    } catch (e) {
      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  private async validate(
    request: HttpContextContract['request'],
    update: { email: string; username: string } | null = null
  ) {
    const option = { trim: true }
    const email = [
      rules.unique({
        table: User.table,
        column: 'email',
        whereNot: !update?.email
          ? undefined
          : {
              email: update.email,
            },
      }),
      rules.normalizeEmail({
        allLowercase: true,
      }),
      rules.minLength(1),
    ]
    const username = [
      rules.unique({
        table: User.table,
        column: 'username',
        whereNot: !update?.username
          ? undefined
          : {
              username: update.username,
            },
      }),
      rules.normalizeEmail({
        allLowercase: true,
      }),
      rules.minLength(2),
      rules.maxLength(64),
    ]
    const password = [rules.minLength(8), rules.maxLength(255), rules.alphaNum()]
    const passwordConfirmation = [rules.equalTo('password')]

    return await request.validate({
      schema: schema.create({
        name: schema.string(option),
        email: schema.string(option, email),
        username: schema.string(option, username),
        password: update ? schema.string.optional(password) : schema.string(option, password),
        password_confirmation: update
          ? schema.string.optional(passwordConfirmation)
          : schema.string(option, passwordConfirmation),
        permissions: schema.array.optional().members(
          schema.number([
            rules.exists({
              table: Permission.table,
              column: 'id',
            }),
          ])
        ),
        roles: schema.array.optional().members(
          schema.number([
            rules.exists({
              table: Role.table,
              column: 'id',
            }),
          ])
        ),
      }),
    })
  }

  public async store({ request, response }: HttpContextContract) {
    const { name, email, username, password, roles, permissions } = await this.validate(request)

    const transaction = await Database.beginGlobalTransaction()

    try {
      const user = await User.create({
        name,
        email,
        username,
        password,
      })

      permissions && (await user.related('permissions').sync(permissions))
      roles && (await user.related('roles').sync(roles))

      await transaction.commit()

      await user.load('permissions')
      await user.load('roles')

      return response.created({
        message: `user ${user.name} has been created`,
        user,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async show({ request, response }: HttpContextContract) {
    const { id } = request.params()

    return response.ok(
      await User.query()
        .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${User.table}.id)) = ?`, [id])
        .firstOrFail()
    )
  }

  public async update({ request, response }: HttpContextContract) {
    const { name, email, username, roles, permissions } = await this.validate(request, {
      email: request.input('email'),
      username: request.input('username'),
    })
    const { id } = request.params()

    const user = await User.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${User.table}.id)) = ?`, [id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      user.name = name
      user.email = email
      user.username = username
      await user.save()

      permissions && (await user.related('permissions').sync(permissions))
      roles && (await user.related('roles').sync(roles))

      await transaction.commit()

      await user.load('permissions')
      await user.load('roles')

      return response.ok({
        message: `user ${user.name} has been updated`,
        user,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async updatePassword({ request, response }: HttpContextContract) {
    const { password } = await request.validate({
      schema: schema.create({
        password: schema.string({ trim: true }, [
          rules.minLength(8),
          rules.maxLength(255),
          rules.alphaNum(),
        ]),
        password_confirmation: schema.string({ trim: true }, [rules.equalTo('password')]),
      }),
    })

    const { id } = request.params()

    const user = await User.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${User.table}.id)) = ?`, [id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      user.password = password
      await user.save()
      await transaction.commit()

      return response.ok({
        message: `password has been updated`,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async destroy({ request, response }: HttpContextContract) {
    const { id } = request.params()
    const user = await User.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${User.table}.id)) = ?`, [id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      await user.delete()
      await transaction.commit()

      return response.ok({
        message: `user ${user.name} has been deleted`,
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
