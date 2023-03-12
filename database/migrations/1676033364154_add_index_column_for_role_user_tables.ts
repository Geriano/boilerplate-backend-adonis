import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'role_user'
  protected columns = ['role_id', 'user_id']

  public async up() {
    this.schema.table(this.tableName, (table) => {
      table.index(this.columns)
    })
  }

  public async down() {
    this.schema.table(this.tableName, (table) => {
      table.dropIndex(this.columns)
    })
  }
}
