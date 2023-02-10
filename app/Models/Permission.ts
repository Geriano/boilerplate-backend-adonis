import { DateTime } from 'luxon'
import { BaseModel, ManyToMany, afterCreate, column, manyToMany } from '@ioc:Adonis/Lucid/Orm'
import { createHash } from 'crypto'
import Env from '@ioc:Adonis/Core/Env'
import Role from './Role'

export default class Permission extends BaseModel {
  @column({
    isPrimary: true,
    serialize(value) {
      return createHash('md5')
        .update(`${Env.get('APP_KEY')}${value}`)
        .digest()
        .toString('hex')
    },
  })
  public id: number

  @column({
    serialize(value: string) {
      return value.toLowerCase()
    },
  })
  public name: string

  @column.dateTime({
    autoCreate: true,
    serializeAs: null,
  })
  public createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    serializeAs: null,
  })
  public updatedAt: DateTime

  @manyToMany(() => Role)
  public roles: ManyToMany<typeof Role>

  @afterCreate()
  public static async attachPermissionToSuperuser(permission: Permission) {
    const superuser = await Role.findByOrFail('name', 'superuser')
    await superuser.related('permissions').attach([permission.$attributes['id']])
  }
}
