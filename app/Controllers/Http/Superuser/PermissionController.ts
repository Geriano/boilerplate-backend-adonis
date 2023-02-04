import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Permission from 'App/Models/Permission'
import Env from '@ioc:Adonis/Core/Env'

export default class PermissionController {
  public async all() {
    return Permission.all()
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

      return response.status(201).send({
        message: `permission ${permission.name} has been created`,
      })
    } catch (e) {
      await transaction.rollback()

      return response.status(500).send({
        message: `${e}`,
      })
    }
  }

  public async multiple({ request, response }: HttpContextContract) {
    const { names } = await request.validate({
      schema: schema.create({
        names: schema
          .array([
            rules.required(),
            rules.unique({
              table: Permission.table,
              column: 'name',
            }),
          ])
          .members(schema.string({ trim: true })),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      const permissions = await Permission.createMany(names.map((name) => ({ name })))

      await transaction.commit()

      return response.status(201).send({
        message: `permission ${permissions
          .map((permission) => permission.name)
          .join(', ')} has been created`,
      })
    } catch (e) {
      await transaction.rollback()

      return response.status(500).send({
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
      .whereRaw(`md5(concat(?, ${Permission.table}.id)) = ?`, [Env.get('APP_KEY'), id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      permission.name = name
      await permission.save()

      return response.status(200).send({
        message: `permission ${permission.name} has been updated`,
      })
    } catch (e) {
      await transaction.rollback()

      return response.status(500).send({
        message: `${e}`,
      })
    }
  }

  public async destroy({ response, params }: HttpContextContract) {
    const id = params.id as string
    const permission = await Permission.query()
      .whereRaw(`md5(concat(?, ${Permission.table}.id)) = ?`, [Env.get('APP_KEY'), id])
      .firstOrFail()

    const transaction = await Database.beginGlobalTransaction()

    try {
      await permission.delete()

      return response.status(200).send({
        message: `permission ${permission.name} has been deleted`,
      })
    } catch (e) {
      await transaction.rollback()

      return response.status(500).send({
        message: `${e}`,
      })
    }
  }
}
