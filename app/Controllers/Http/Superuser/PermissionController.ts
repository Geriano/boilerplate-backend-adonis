import { bind } from '@adonisjs/route-model-binding'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { __, send, transaction, validate } from 'App/helpers'
import Permission from 'App/Models/Permission'

export default class PermissionController {
  public async index() {
    return send(Permission.query().select(['id', 'name', 'key']).exec())
  }

  public async store() {
    const { name, key } = await validate({
      name: schema.string.nullableAndOptional({ trim: true }),
      key: schema.string({ trim: true }, [
        rules.unique({
          table: Permission.table,
          column: 'key',
        }),
      ]),
    })

    return transaction(async () => {
      const permission = await Permission.create({ name, key })

      return {
        message: __('messages.permission.created', {
          title: permission.title,
        }),
        permission,
      }
    })
  }

  @bind()
  public async update(_, permission: Permission) {
    const { name, key } = await validate({
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
    })

    return transaction(async () => {
      permission.key = key
      name !== undefined && (permission.name = name)
      await permission.save()

      return {
        message: __('messages.permission.updated', {
          title: permission.title,
        }),
        permission,
      }
    })
  }

  @bind()
  public async destroy(_, permission: Permission) {
    return transaction(async () => {
      await permission.delete()

      return {
        message: __('messages.permission.deleted', {
          title: permission.title,
        }),
        permission,
      }
    })
  }
}
