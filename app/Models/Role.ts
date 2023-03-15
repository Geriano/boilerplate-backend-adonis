import { DateTime } from 'luxon'
import { __ } from 'App/helpers'
import {
  BaseModel,
  ManyToMany,
  ModelQueryBuilderContract,
  beforeCreate,
  beforeFetch,
  beforeFind,
  beforeSave,
  column,
  computed,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import Permission from './Permission'

export default class Role extends BaseModel {
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
    return __(`messages.role.value.${this.name || this.key}`)
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

  @manyToMany(() => Permission)
  public permissions: ManyToMany<typeof Permission>

  @beforeFetch()
  public static async fetchPermissions(query: ModelQueryBuilderContract<typeof Role>) {
    query.preload('permissions')
  }

  @beforeFind()
  public static async findPermissions(query: ModelQueryBuilderContract<typeof Role>) {
    query.preload('permissions')
  }

  @beforeCreate()
  @beforeSave()
  public static async sanitize(role: Role) {
    role.name = role.name?.toLowerCase() || null
    role.key = role.key.toLowerCase()
  }

  public hasPermission(permissions: string | string[]) {
    if (Array.isArray(permissions)) {
      for (const permission of permissions) {
        if (this.hasPermission(permission)) {
          return true
        }
      }

      return false
    }

    return this.permissions.find((permission) => permission.key === permissions) !== undefined
  }
}
