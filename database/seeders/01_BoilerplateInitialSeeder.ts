import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import User from 'App/Models/User'

export default class extends BaseSeeder {
  public async run() {
    const superuser = await User.create({
      name: 'superuser',
      email: 'superuser@local.app',
      username: 'su',
      password: 'password',
    })
  }
}
