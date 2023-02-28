import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class CsrfToken extends BaseModel {
  @column({ isPrimary: true })
  public id: string

  @column()
  public ip: string

  @column()
  public expiredAt: DateTime

  @column()
  public used: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
