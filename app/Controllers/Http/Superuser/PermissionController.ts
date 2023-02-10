import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Permission from 'App/Models/Permission'
import Env from '@ioc:Adonis/Core/Env'

export default class PermissionController {
  public async all({ response }: HttpContextContract) {
    try {
      return response.ok(await Permission.all())
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
          rules.required(),
          rules.unique({
            table: Permission.table,
            column: 'name',
          }),
        ]),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      const permission = await Permission.create({ name })

      await transaction.commit()

      return response.created({
        message: `permission ${permission.name} has been created`,
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
    const id = params.id as string
    const { name } = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [
          rules.required(),
          rules.unique({
            table: Permission.table,
            column: 'name',
          }),
        ]),
      }),
    })

    const permission = await Permission.query()
      .whereRaw(`md5(concat('${Env.get('APP_KEY')}', ${Permission.table}.id)) = ?`, [id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      permission.name = name
      await permission.save()

      return response.ok({
        message: `permission ${permission.name} has been updated`,
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
        message: `permission ${permission.name} has been deleted`,
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
