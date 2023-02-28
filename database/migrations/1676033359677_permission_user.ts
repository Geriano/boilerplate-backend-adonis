/* eslint-disable prettier/prettier */
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'permission_user'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id')
        .primary()
      table.uuid('permission_id')
        .unsigned()
        .references('id')
        .inTable('permissions')
        .onDelete('cascade')
      table.uuid('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('cascade')

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
