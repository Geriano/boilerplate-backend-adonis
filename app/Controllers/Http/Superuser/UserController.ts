import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import User from 'App/Models/User'
import Role from 'App/Models/Role'
import Permission from 'App/Models/Permission'
import { DateTime } from 'luxon'

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

  private async validate(request: HttpContextContract['request'], update: User | null = null) {
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
      rules.minLength(2),
      rules.maxLength(64),
    ]
    const password = [rules.minLength(8), rules.maxLength(255), rules.alphaNum()]
    const passwordConfirmation = [rules.confirmed('password')]

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
          schema.string([
            rules.exists({
              table: Permission.table,
              column: 'key',
            }),
          ])
        ),
        roles: schema.array.optional().members(
          schema.string([
            rules.exists({
              table: Role.table,
              column: 'key',
            }),
          ])
        ),
      }),
    })
  }

  public async store({ request, response, i18n }: HttpContextContract) {
    const { name, email, username, password, roles, permissions } = await this.validate(request)

    const transaction = await Database.beginGlobalTransaction()

    try {
      const user = await User.create({
        name,
        email,
        username,
        password,
        emailVerifiedAt: DateTime.now(),
      })

      if (Array.isArray(permissions)) {
        await user.related('permissions').attach(
          await Permission.query()
            .whereIn('key', permissions)
            .then((permissions) => permissions.map((permission) => permission.id))
        )
      }

      if (Array.isArray(roles)) {
        await user.related('roles').attach(
          await Permission.query()
            .whereIn('key', roles)
            .then((roles) => roles.map((role) => role.id))
        )
      }

      await transaction.commit()
      await user.load('permissions')
      await user.load('roles')

      return response.created({
        message: i18n.formatMessage('messages.user.created', {
          title: user.name,
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

  public async show({ response, params }: HttpContextContract) {
    return response.ok(await User.findOrFail(params.user))
  }

  public async update({ request, response, params, i18n }: HttpContextContract) {
    const user = await User.findOrFail(params.user)
    const { name, email, username, roles, permissions } = await this.validate(request, user)

    const transaction = await Database.beginGlobalTransaction()

    try {
      user.name = name
      user.email = email
      user.username = username
      await user.save()

      if (Array.isArray(permissions)) {
        await user.related('permissions').sync(
          await Permission.query()
            .whereIn('key', permissions)
            .then((permissions) => permissions.map((permission) => permission.id))
        )
      }

      if (Array.isArray(roles)) {
        await user.related('roles').sync(
          await Permission.query()
            .whereIn('key', roles)
            .then((roles) => roles.map((role) => role.id))
        )
      }

      await transaction.commit()
      await user.load('permissions')
      await user.load('roles')

      return response.ok({
        message: i18n.formatMessage('messages.user.updated', {
          title: user.name,
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

  public async updatePassword({ request, response, params, i18n }: HttpContextContract) {
    const user = await User.findOrFail(params.user)
    const { password } = await request.validate({
      schema: schema.create({
        password: schema.string({ trim: true }, [
          rules.minLength(8),
          rules.maxLength(255),
          rules.alphaNum(),
        ]),
        password_confirmation: schema.string({ trim: true }, [rules.confirmed('password')]),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      user.password = password
      await user.save()
      await transaction.commit()

      return response.ok({
        message: i18n.formatMessage('messages.user.password updated'),
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async destroy({ response, params, i18n }: HttpContextContract) {
    const user = await User.findOrFail(params.user)
    const transaction = await Database.beginGlobalTransaction()

    try {
      await user.delete()
      await transaction.commit()

      return response.ok({
        message: i18n.formatMessage('messages.user.deleted', {
          title: user.name,
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

  public async togglePermission({ response, params, i18n }: HttpContextContract) {
    const user = await User.findOrFail(params.user)
    const permission = await Permission.findOrFail(params.permission)
    const transaction = await Database.beginGlobalTransaction()

    try {
      if (user.permissions.find((p) => permission.id === p.id)) {
        await user.related('permissions').detach([permission.id])
      } else {
        await user.related('permissions').attach([permission.id])
      }

      await transaction.commit()

      return response.ok({
        message: i18n.formatMessage('messages.user.updated', {
          title: user.name,
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

  public async toggleRole({ response, params, i18n }: HttpContextContract) {
    const user = await User.findOrFail(params.user)
    const role = await Role.findOrFail(params.role)
    const transaction = await Database.beginGlobalTransaction()

    try {
      if (user.roles.find((r) => role.id === r.id)) {
        await user.related('roles').detach([role.id])
      } else {
        await user.related('roles').attach([role.id])
      }

      await transaction.commit()

      return response.ok({
        message: i18n.formatMessage('messages.user.updated', {
          title: user.name,
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
