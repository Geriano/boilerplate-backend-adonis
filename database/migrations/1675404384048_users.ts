/* eslint-disable prettier/prettier */
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('name')
      table.string('email', 255)
        .notNullable()
        .unique()
      table.string('username', 64)
        .notNullable()
        .unique()
      table.string('password', 180)
        .notNullable()
      table.string('remember_me_token')
        .nullable()
      table.timestamp('email_verified_at', { useTz: true })
        .nullable()
        .defaultTo(null)

      /**
       * Uses timestampz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
