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

    const dev = await User.create({
      name: 'dev',
      email: 'dev@local.app',
      username: 'dev',
      password: 'password',
    })

    const superuser = await Role.create({
      key: 'superuser',
    })

    const developer = await Role.create({
      key: 'developer',
    })

    su.related('roles').attach([superuser.$attributes.id])
    dev.related('roles').attach([developer.$attributes.id])

    const permissions: number[] = []

    for (const name of this.permissions) {
      for (const ability of ['create', 'read', 'update', 'delete']) {
        const permission = await Permission.create({
          key: `${ability} ${name}`,
        })

        if (name !== 'user') {
          permissions.push(permission.$attributes.id)
        }
      }
    }

    for (const type of ['permission', 'role']) {
      const permission = await Permission.create({
        key: `configure ${type} key`,
      })

      permissions.push(permission.id)
    }

    developer.related('permissions').sync(permissions)
  }
}
