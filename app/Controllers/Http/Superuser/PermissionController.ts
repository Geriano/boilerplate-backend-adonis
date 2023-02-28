import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Permission from 'App/Models/Permission'

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

  public async store({ request, response, i18n }: HttpContextContract) {
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
        message: i18n.formatMessage('messages.permission.created', {
          title: permission.title,
        }),
        permission,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async update({ request, response, params, i18n }: HttpContextContract) {
    const permission = await Permission.findOrFail(params.permission)
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
        message: i18n.formatMessage('messages.permission.updated', {
          title: permission.title,
        }),
        permission,
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  public async destroy({ response, params, i18n }: HttpContextContract) {
    const permission = await Permission.findOrFail(params.permission)
    const transaction = await Database.beginGlobalTransaction()

    try {
      await permission.delete()

      return response.ok({
        message: i18n.formatMessage('messages.permission.deleted', {
          title: permission.title,
        }),
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
