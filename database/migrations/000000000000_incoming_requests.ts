/* eslint-disable prettier/prettier */
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'incoming_requests'

  public async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id')
          .primary()
      table.string('name')
      table.string('method')
      table.string('path')
      table.string('ip', 45)
      table.integer('time').unsigned()

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
    this.schema.raw(`ALTER TABLE ${this.tableName} ALTER COLUMN id SET DEFAULT uuid_generate_v4()`)
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
