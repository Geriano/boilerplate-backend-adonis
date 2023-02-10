import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Role from 'App/Models/Role'
import Env from '@ioc:Adonis/Core/Env'

export default class RoleController {
  public async all({ response }: HttpContextContract) {
    try {
      return response.ok(await Role.query().select(['id', 'name']).exec())
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
            query.whereILike('name', `%${search || ''}%`)
          })
          .orderBy(order.key, order.dir as 'asc' | 'desc')
          .preload('permissions', (query) => query.select(['id', 'name']))
          .paginate(page, limit)
      )
    } catch (e) {
      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async store({ request, response }: HttpContextContract) {
    const { name } = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [
          rules.unique({
            table: Role.table,
            column: 'name',
          }),
        ]),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      const role = await Role.create({ name })

      await transaction.commit()

      return response.created({
        message: `role ${role.name} has been created`,
        role,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async update({ request, response, params }: HttpContextContract) {
    const id = params.id as string
    const { name } = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [
          rules.unique({
            table: Role.table,
            column: 'name',
          }),
        ]),
      }),
    })

    const role = await Role.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${Role.table}.id)) = ?`, [id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      role.name = name
      await role.save()

      return response.ok({
        message: `role ${role.name} has been updated`,
        role,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async destroy({ response, params }: HttpContextContract) {
    const id = params.id as string
    const role = await Role.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${Role.table}.id)) = ?`, [id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      await role.delete()

      return response.ok({
        message: `role ${role.name} has been deleted`,
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
