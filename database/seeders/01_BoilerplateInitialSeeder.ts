import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Permission from 'App/Models/Permission'
import Role from 'App/Models/Role'
import User from 'App/Models/User'

export default class extends BaseSeeder {
  private permissions = ['permission', 'role', 'user']
  public async run() {
    const su = await User.create({
      name: 'superuser',
      email: 'superuser@local.app',
      username: 'su',
      password: 'password',
    })

    const superuser = await Role.create({
      name: 'superuser',
    })

    su.related('roles').attach([superuser.$attributes.id])

    for (const permission of this.permissions) {
      for (const ability of ['create', 'read', 'update', 'delete']) {
        await Permission.create({
          name: `${ability} ${permission}`,
        })
      }
    }
  }
}
