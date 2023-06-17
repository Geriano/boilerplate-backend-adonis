import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class LogoutController {
  /**
   * @swagger
   * /logout:
   *  delete:
   *    summary: Logout
   *    security:
   *      - token: []
   *      - csrf: []
   *    tags:
   *      - Authentication
   *    produces:
   *      - application/json
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                message:
   *                  type: string
   *      419:
   *        description: PageExpired
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/PageExpired'
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async process({ auth, response, i18n }: HttpContextContract) {
    await auth.use('api').revoke()

    return response.ok({
      message: i18n.formatMessage('messages.auth.logouted'),
    })
  }
}
