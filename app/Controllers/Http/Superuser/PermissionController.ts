import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Permission from 'App/Models/Permission'
import Env from '@ioc:Adonis/Core/Env'

export default class PermissionController {
  public async all({ response }: HttpContextContract) {
    try {
      return response.ok(await Permission.query().select(['id', 'name', 'key']).exec())
    } catch (e) {
      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async store({ request, response }: HttpContextContract) {
    const { name, key } = await request.validate({
      schema: schema.create({
        name: schema.string.nullableAndOptional({ trim: true }),
        key: schema.string({ trim: true }, [
          rules.unique({
            table: Permission.table,
            column: 'key',
          }),
        ]),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      const permission = await Permission.create({ name, key })

      await transaction.commit()

      return response.created({
        message: `permission ${permission.title} has been created`,
        permission,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async update({ request, response, params }: HttpContextContract) {
    const permission = await Permission.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${Permission.table}.id)) = ?`, [params.id])
      .firstOrFail()

    const { name, key } = await request.validate({
      schema: schema.create({
        name: schema.string.nullableAndOptional({ trim: true }),
        key: schema.string({ trim: true }, [
          rules.unique({
            table: Permission.table,
            column: 'key',
            whereNot: {
              id: permission.$attributes.id,
            },
          }),
        ]),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      permission.key = key
      name !== undefined && (permission.name = name)
      await permission.save()

      return response.ok({
        message: `permission ${permission.title} has been updated`,
        permission,
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
    const permission = await Permission.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${Permission.table}.id)) = ?`, [id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      await permission.delete()

      return response.ok({
        message: `permission ${permission.title} has been deleted`,
        permission,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }
}
