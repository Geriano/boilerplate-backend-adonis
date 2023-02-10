/* eslint-disable prettier/prettier */
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'role_user'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
        .unsigned()
      table.bigInteger('role_id')
        .unsigned()
        .references('id')
        .inTable('roles')
        .onDelete('cascade')
      table.bigInteger('user_id')
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
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
