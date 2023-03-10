import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Permission from 'App/Models/Permission'
import Role from 'App/Models/Role'
import User from 'App/Models/User'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  private permissions = ['permission', 'role', 'user']
  public async run() {
    const su = await User.create({
      name: 'superuser',
      email: 'superuser@local.app',
      username: 'su',
      password: 'password',
      emailVerifiedAt: DateTime.now(),
    })

    const dev = await User.create({
      name: 'dev',
      email: 'dev@local.app',
      username: 'dev',
      password: 'password',
      emailVerifiedAt: DateTime.now(),
    })

    const superuser = await Role.create({
      key: 'superuser',
    })

    const developer = await Role.create({
      key: 'developer',
    })

    su.related('roles').attach([superuser.id])
    dev.related('roles').attach([developer.id])

    const permissions: string[] = []

    for (const name of this.permissions) {
      for (const ability of ['create', 'read', 'update', 'delete']) {
        const permission = await Permission.create({
          key: `${ability} ${name}`,
        })

        if (name !== 'user') {
          permissions.push(permission.id)
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
