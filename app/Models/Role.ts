import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { createHash } from 'crypto'
import Env from '@ioc:Adonis/Core/Env'

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

  @column()
  public name: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
