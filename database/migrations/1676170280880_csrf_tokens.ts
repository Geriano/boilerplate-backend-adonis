/* eslint-disable prettier/prettier */
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'csrf_tokens'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
        .unsigned()
      table.string('ip', 45)
      table.timestamp('expired_at', { useTz: true })
      table.boolean('used').defaultTo(false)

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
