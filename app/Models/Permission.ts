import { DateTime } from 'luxon'
import {
  BaseModel,
  ManyToMany,
  afterCreate,
  column,
  computed,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import { createHash } from 'crypto'
import Env from '@ioc:Adonis/Core/Env'
import HttpContext from '@ioc:Adonis/Core/HttpContext'
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

    return i18n.formatMessage(`messages.permission.value.${title}`)
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
    await superuser.related('permissions').attach([permission.$attributes.id])
  }
}
