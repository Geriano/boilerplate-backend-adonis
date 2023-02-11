import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Role from 'App/Models/Role'
import Env from '@ioc:Adonis/Core/Env'
import Permission from 'App/Models/Permission'

export default class RoleController {
  public async all({ response }: HttpContextContract) {
    try {
      const roles = await Role.all()

      return response.ok(
        roles.map((role) => {
          const data = role.serialize()

          return {
            id: data.id,
            title: data.title,
            key: data.key,
          }
        })
      )
    } catch (e) {
      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async paginate({ request, response }: HttpContextContract) {
    const { page, limit, search, order } = await request.validate({
      schema: schema.create({
        page: schema.number(),
        limit: schema.number(),
        search: schema.string.optional(),
        order: schema.object().members({
          dir: schema.enum(['asc', 'desc']),
          key: schema.enum(['name']),
        }),
      }),
    })

    try {
      return response.ok(
        await Role.query()
          .where((query) => {
            const s = `%${search || ''}%`
            query.whereILike('name', s).orWhereILike('key', s)
          })
          .orderBy(order.key, order.dir as 'asc' | 'desc')
          .preload('permissions', (query) => query.select(['id', 'name', 'key']))
          .paginate(page, limit)
      )
    } catch (e) {
      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async store({ request, response, i18n }: HttpContextContract) {
    const { name, key, permissions } = await request.validate({
      schema: schema.create({
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
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
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
      await transaction.commit()

      return response.created({
        message: i18n.formatMessage('messages.role.created', {
          title: role.title,
        }),
        role,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async show({ response, params }: HttpContextContract) {
    const role = await Role.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${Role.table}.id)) = ?`, [params.id])
      .firstOrFail()

    return response.ok(role)
  }

  public async update({ request, response, params, i18n }: HttpContextContract) {
    const role = await Role.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${Role.table}.id)) = ?`, [params.id])
      .firstOrFail()

    const { name, key, permissions } = await request.validate({
      schema: schema.create({
        name: schema.string.nullableAndOptional({ trim: true }),
        key: schema.string({ trim: true }, [
          rules.unique({
            table: Role.table,
            column: 'key',
            whereNot: {
              id: role.$attributes.id,
            },
          }),
        ]),
        permissions: schema.array
          .nullableAndOptional()
          .members(schema.number([rules.exists({ table: Permission.table, column: 'id' })])),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
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

      return response.ok({
        message: i18n.formatMessage('messages.role.updated', {
          title: role.title,
        }),
        role,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async destroy({ response, params, i18n }: HttpContextContract) {
    const role = await Role.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${Role.table}.id)) = ?`, [params.id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      await role.delete()

      return response.ok({
        message: i18n.formatMessage('messages.role.deleted', {
          title: role.title,
        }),
        role,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }
}
