import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import IncomingRequest from 'App/Models/IncomingRequest'

export default class IncomingRequestController {
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
        Database.raw(`sum(time) / (${count}) average`),
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
