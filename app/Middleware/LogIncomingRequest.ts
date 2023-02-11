import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import IncomingRequest from 'App/Models/IncomingRequest'

export default class LogIncomingRequest {
  public async handle({ request, route }: HttpContextContract, next: () => Promise<void>) {
    const name = route?.name
    const method = request.method()
    const path = request.url(true)
    const start = new Date().getTime()
    const ip = request.ip()

    await next()

    await IncomingRequest.create({
      name,
      method,
      path: request.url(),
      ip,
      time: new Date().getTime() - start,
    })

    const end = new Date().getTime()
    let diff = end - start
    let unit = 'ms'

    if (diff >= 60 * 1000) {
      unit = 'min'
      diff /= 60 + 1000
    } else if (diff >= 1000) {
      unit = 'sec'
      diff /= 1000
    }

    console.log(`[${diff.toFixed(0).padStart(3)}${unit}][${ip}][${method}] ${path}`)
  }
}
