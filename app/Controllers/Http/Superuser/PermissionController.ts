import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Permission from 'App/Models/Permission'

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
        message: `permission ${permission.name}`,
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

  public async update({ request, response }: HttpContextContract, permission: Permission) {
    const { name } = await request.validate({
      schema: schema.create({
        name: schema.string({ trim: true }, [
          rules.required(),
          rules.unique({
            table: Permission.table,
            column: 'name',
            whereNot: {
              id: permission.id,
            },
          }),
        ]),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      permission.name = name
      permission = await permission.save()

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

  public async destroy({ response }: HttpContextContract, permission: Permission) {
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
