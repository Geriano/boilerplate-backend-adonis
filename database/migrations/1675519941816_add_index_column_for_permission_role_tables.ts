import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'permission_role'
  protected columns = ['permission_id', 'role_id']

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
