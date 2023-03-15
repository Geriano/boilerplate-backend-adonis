import { compose } from '@ioc:Adonis/Core/Helpers'
import { SoftDeletes } from '@ioc:Adonis/Addons/LucidSoftDeletes'
import { DateTime } from 'luxon'
import {
  column,
  beforeSave,
  BaseModel,
  manyToMany,
  ManyToMany,
  beforeFind,
  ModelQueryBuilderContract,
  beforeCreate,
} from '@ioc:Adonis/Lucid/Orm'
import Hash from '@ioc:Adonis/Core/Hash'
import Permission from './Permission'
import Role from './Role'

export default class User extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true })
  public id: string

  @column()
  public name: string

  @column()
  public profilePhotoPath: string | null

  @column()
  public email: string

  @column()
  public username: string

  @column({ serializeAs: null })
  public password: string

  @column({ serializeAs: null })
  public rememberMeToken: string | null

  @column.dateTime()
  public emailVerifiedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @manyToMany(() => Permission)
  public permissions: ManyToMany<typeof Permission>

  @manyToMany(() => Role)
  public roles: ManyToMany<typeof Role>

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }

  @beforeFind()
  public static async preloadPermissionsAndRoles(query: ModelQueryBuilderContract<typeof User>) {
    query.preload('permissions', (query) => query.select(['id', 'name', 'key']))
    query.preload('roles', (query) => query.select(['id', 'name', 'key']))
  }

  @beforeCreate()
  @beforeSave()
  public static async sanitize(user: User) {
    user.name = user.name.toLowerCase()
    user.email = user.email.toLowerCase()
    user.username = user.username.toLowerCase()
  }

  public hasRole(roles: string | string[]) {
    if (Array.isArray(roles)) {
      for (const role of roles) {
        if (this.hasRole(role)) {
          return true
        }
      }

      return false
    }

    return this.roles.find((role) => role.key === roles) !== undefined
  }

  public hasPermission(permissions: string | string[]) {
    if (Array.isArray(permissions)) {
      for (const role of permissions) {
        if (this.hasPermission(role)) {
          return true
        }
      }

      return false
    }

    if (this.permissions.find((role) => role.key === permissions) !== undefined) {
      return true
    }

    for (const role of this.roles) {
      if (role.hasPermission(permissions)) {
        return true
      }
    }

    return false
  }

  public can(permissionsOrRoles: string | string[]) {
    return this.hasPermission(permissionsOrRoles) || this.hasRole(permissionsOrRoles)
  }
}
