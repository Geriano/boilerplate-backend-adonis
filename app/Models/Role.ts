import { DateTime } from 'luxon'
import {
  BaseModel,
  ManyToMany,
  ModelQueryBuilderContract,
  beforeFetch,
  column,
  computed,
  manyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import { createHash } from 'crypto'
import Env from '@ioc:Adonis/Core/Env'
import Permission from './Permission'
import { HttpContext } from '@adonisjs/core/build/standalone'

export default class Role extends BaseModel {
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
  public static async preloadPermissions(query: ModelQueryBuilderContract<typeof Role>) {
    query.preload('permissions')
  }
}
