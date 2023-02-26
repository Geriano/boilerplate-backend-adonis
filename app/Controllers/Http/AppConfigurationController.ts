import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import * as app from '../../../config/app'
import auth from '../../../config/auth'
import bodyparser from '../../../config/bodyparser'
import cors from '../../../config/cors'
import database from '../../../config/database'
import drive from '../../../config/drive'
import hash from '../../../config/hash'
import i18n from '../../../config/i18n'
import mail from '../../../config/mail'

export default class AppConfigurationController {
  public async index({ response }: HttpContextContract) {
    console.log('test')
    return response.ok({
      app: {
        http: app.http,
        logger: app.logger,
        profiler: app.profiler,
        validator: app.validator,
      },
      auth,
      bodyparser,
      cors,
      database: {
        connection: database.connection,
      },
      drive,
      hash,
      i18n,
      mail: {
        mailer: mail.mailer,
      },
    })
  }
}
