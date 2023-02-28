import { DateTime } from 'luxon'
import {
  BaseModel,
  ManyToMany,
  ModelQueryBuilderContract,
  beforeFetch,
  beforeFind,
  column,
  computed,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import Permission from './Permission'
import { HttpContext } from '@adonisjs/core/build/standalone'

export default class Role extends BaseModel {
  @column({ isPrimary: true })
  public id: string

  @column({
    serializeAs: null,
  })
  public name: string | null

  @column({
    serialize(value: string) {
      return value.toLowerCase()
    },
  })
  public key: string

  @computed()
  public get title() {
    const { i18n } = HttpContext.get()!
    const title = this.name || this.key

    return i18n.formatMessage(`messages.role.value.${title}`)
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
