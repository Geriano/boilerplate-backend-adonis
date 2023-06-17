import { DateTime } from 'luxon'
import { __ } from 'App/helpers'
import {
  BaseModel,
  ManyToMany,
  afterCreate,
  beforeCreate,
  beforeSave,
  column,
  computed,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import Role from './Role'

/**
 * @swagger
 * components:
 *  schemas:
 *    Permission:
 *      type: object
 *      properties:
 *        id:
 *          type: string
 *          example: c6fc42c9-fe5c-4894-a8e7-7da3e3e8d54b
 *        name:
 *          type: string
 *          example: create user
 *        key:
 *          type: string
 *          example: create user
 */
export default class Permission extends BaseModel {
  @column({ isPrimary: true })
  public id: string

  @column({ serializeAs: null })
  public name: string | null

  @column({
    serialize(value: string) {
      return value.toLowerCase()
    },
  })
  public key: string

  @computed()
  public get title() {
    return __(`messages.permission.value.${this.name || this.key}`)
  }

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
    const superuser = await Role.findByOrFail('key', 'superuser')

    await superuser.related('permissions').attach([permission.id])
  }

  @beforeCreate()
  @beforeSave()
  public static async sanitize(permission: Permission) {
    permission.name = permission.name?.toLowerCase() || null
    permission.key = permission.key.toLowerCase()
  }
}
