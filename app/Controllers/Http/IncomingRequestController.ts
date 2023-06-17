import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import IncomingRequest from 'App/Models/IncomingRequest'

export default class IncomingRequestController {
  /**
   * @swagger
   * /incoming-request/average:
   *  get:
   *    summary: Average time every incoming request
   *    tags:
   *      - Health Check
   *    produces:
   *      - application/json
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: array
   *              items:
   *                type: object
   *                properties:
   *                  name:
   *                    type: string
   *                    example: /user
   *                  method:
   *                    type: string
   *                    example: POST
   *                  average:
   *                    type: number
   *                    example: 100
   *                  min:
   *                    type: number
   *                    example: 100
   *                  max:
   *                    type: number
   *                    example: 100
   *                  count:
   *                    type: number
   *                    example: 100
   *      419:
   *        description: PageExpired
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/PageExpired'
   *      422:
   *        description: Unprocessable Entity
   *        content:
   *          application/json:
   *            schema:
   *              type: array
   *              items:
   *                $ref: '#/components/schemas/ValidationError'
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async average({ response }: HttpContextContract) {
    const count = Database.query()
      .select([Database.raw('count(*)')])
      .from(`${IncomingRequest.table} as x`)
      .whereRaw('x.name = y.name')
      .whereRaw('x.method = y.method')
      .toQuery()

    const requests = await Database.query()
      .select([
        'name',
        'method',
        Database.raw(`case when (${count}) > 0 then (sum(time) / (${count})) else 0 end average`),
        Database.raw(`min(time) min`),
        Database.raw(`max(time) max`),
        Database.raw(`(${count}) count`),
      ])
      .from(`${IncomingRequest.table} as y`)
      .groupBy(['method', 'name'])
      .exec()

    return response.ok(
      requests.map((request) => {
        return {
          ...request,
          average: Number(request.average),
          min: Number(request.min),
          max: Number(request.max),
          count: Number(request.count),
        }
      })
    )
  }
}
