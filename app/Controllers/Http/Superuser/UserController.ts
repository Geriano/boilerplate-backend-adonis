import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { DateTime } from 'luxon'
import { __, response, send, transaction, validate } from 'App/helpers'
import { bind } from '@adonisjs/route-model-binding'
import User from 'App/Models/User'
import Role from 'App/Models/Role'
import Permission from 'App/Models/Permission'

export default class UserController {
  public async index() {
    const { page, limit, search, order } = await validate({
      page: schema.number(),
      limit: schema.number(),
      search: schema.string.optional(),
      order: schema.object().members({
        dir: schema.enum(['asc', 'desc']),
        key: schema.enum(['name', 'email', 'username']),
      }),
    })

    return send(
      User.query()
        .where((query) => {
          const s = `%${search || ''}%`
          query.orWhereILike('name', s).orWhereILike('email', s).orWhereILike('username', s)
        })
        .orderBy(order.key, order.dir as 'asc' | 'desc')
        .preload('permissions', (query) => query.select(['id', 'name', 'key']))
        .preload('roles', (query) => query.select(['id', 'name', 'key']))
        .paginate(page, limit)
    )
  }

  private async validate(update?: User) {
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
    const password = [rules.minLength(8), rules.maxLength(255), rules.trim()]
    const passwordConfirmation = [rules.confirmed('password')]

    return await validate({
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
    })
  }

  public async store() {
    const { name, email, username, password, roles, permissions } = await this.validate()

    return transaction(async () => {
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

      await user.load('permissions')
      await user.load('roles')

      return response().created({
        message: __('messages.user.created', {
          title: user.name,
        }),
        user,
      })
    })
  }

  @bind()
  public async show(_, user: User) {
    await user.load('permissions')
    await user.load('roles')

    return user
  }

  @bind()
  public async update(_, user: User) {
    const { name, email, username, roles, permissions } = await this.validate(user)

    return transaction(async () => {
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

      await user.load('permissions')
      await user.load('roles')

      return {
        message: __('messages.user.updated', {
          title: user.name,
        }),
        user,
      }
    })
  }

  @bind()
  public async updatePassword(_, user: User) {
    const { password } = await validate({
      password: schema.string({ trim: true }, [
        rules.minLength(8),
        rules.maxLength(255),
        rules.trim(),
      ]),
      password_confirmation: schema.string({ trim: true }, [rules.confirmed('password')]),
    })

    return transaction(async () => {
      user.password = password
      await user.save()

      return {
        message: __('messages.user.password updated'),
      }
    })
  }

  @bind()
  public async destroy(_, user: User) {
    return transaction(async () => {
      await user.delete()

      return {
        message: __('messages.user.deleted', {
          title: user.name,
        }),
        user,
      }
    })
  }

  @bind()
  public async togglePermission(_, user: User, permission: Permission) {
    return transaction(async () => {
      if (user.permissions.find((p) => permission.id === p.id)) {
        await user.related('permissions').detach([permission.id])
      } else {
        await user.related('permissions').attach([permission.id])
      }

      return {
        message: __('messages.user.updated', {
          title: user.name,
        }),
      }
    })
  }

  @bind()
  public async toggleRole(_, user: User, role: Role) {
    return transaction(async () => {
      if (user.roles.find((r) => role.id === r.id)) {
        await user.related('roles').detach([role.id])
      } else {
        await user.related('roles').attach([role.id])
      }

      return {
        message: __('messages.user.updated', {
          title: user.name,
        }),
      }
    })
  }
}
