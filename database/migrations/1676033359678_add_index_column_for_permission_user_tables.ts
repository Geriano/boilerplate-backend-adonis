import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'permission_user'
  protected columns = ['permission_id', 'user_id']

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
