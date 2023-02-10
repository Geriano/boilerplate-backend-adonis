/* eslint-disable prettier/prettier */
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'permission_role'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
        .unsigned()
      table.bigInteger('permission_id')
        .references('id')
        .inTable('permissions')
        .onDelete('cascade')
      table.bigInteger('role_id')
        .references('id')
        .inTable('roles')
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