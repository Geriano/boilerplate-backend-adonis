import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { __, send, transaction, validate } from 'App/helpers'
import { bind } from '@adonisjs/route-model-binding'
import Role from 'App/Models/Role'
import Permission from 'App/Models/Permission'

export default class RoleController {
  public async all() {
    return send(async () => {
      const roles = await Role.all()

      return roles.map((role) => {
        const data = role.serialize()

        return {
          id: data.id,
          title: data.title,
          key: data.key,
        }
      })
    })
  }

  public async index() {
    const { page, limit, search, order } = await validate({
      page: schema.number(),
      limit: schema.number(),
      search: schema.string.optional(),
      order: schema.object().members({
        dir: schema.enum(['asc', 'desc']),
        key: schema.enum(['name', 'key']),
      }),
    })

    return send(
      Role.query()
        .where((query) => {
          const s = `%${search || ''}%`
          query.whereILike('name', s).orWhereILike('key', s)
        })
        .orderBy(order.key, order.dir as 'asc' | 'desc')
        .preload('permissions', (query) => query.select(['id', 'name', 'key']))
        .paginate(page, limit)
    )
  }

  public async store() {
    const { name, key, permissions } = await validate({
      name: schema.string.nullableAndOptional({ trim: true }),
      key: schema.string({ trim: true }, [
        rules.unique({
          table: Role.table,
          column: 'key',
        }),
      ]),
      permissions: schema.array
        .nullableAndOptional()
        .members(schema.number([rules.exists({ table: Permission.table, column: 'id' })])),
    })

    return transaction(async () => {
      const role = await Role.create({ name, key })

      if (permissions) {
        await role.related('permissions').attach(
          await Permission.query()
            .whereIn('key', permissions)
            .select(['id'])
            .exec()
            .then((permissions) => permissions.map((permission) => permission.id))
        )
      }

      await role.load('permissions')

      return {
        message: __('messages.role.created', {
          title: role.title,
        }),
        role,
      }
    })
  }

  @bind()
  public async show(_, role: Role) {
    return role
  }

  @bind()
  public async update(_, role: Role) {
    const { name, key, permissions } = await validate({
      name: schema.string.nullableAndOptional({ trim: true }),
      key: schema.string({ trim: true }, [
        rules.unique({
          table: Role.table,
          column: 'key',
          whereNot: {
            id: role.id,
          },
        }),
      ]),
      permissions: schema.array
        .nullableAndOptional()
        .members(
          schema.string([
            rules.uuid({ version: 4 }),
            rules.exists({ table: Permission.table, column: 'id' }),
          ])
        ),
    })

    return transaction(async () => {
      role.key = key
      name !== undefined && (role.name = name)
      await role.save()

      if (Array.isArray(permissions)) {
        await role.related('permissions').sync(
          await Permission.query()
            .whereIn('key', permissions)
            .select(['id'])
            .exec()
            .then((permissions) => permissions.map((permission) => permission.id))
        )
      }

      return {
        message: __('messages.role.updated', {
          title: role.title,
        }),
        role,
      }
    })
  }

  @bind()
  public async destroy(_, role: Role) {
    return transaction(async () => {
      await role.delete()

      return {
        message: __('messages.role.deleted', {
          title: role.title,
        }),
        role,
      }
    })
  }

  @bind()
  public async togglePermission(_, role: Role, permission: Permission) {
    return transaction(async () => {
      if (role.permissions.find((p) => p.key === permission.key)) {
        await role.related('permissions').detach([permission.id])
      } else {
        await role.related('permissions').attach([permission.id])
      }

      return {
        message: __('messages.role.updated', {
          title: role.title,
        }),
        role,
      }
    })
  }
}
