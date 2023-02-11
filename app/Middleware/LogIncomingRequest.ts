import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class LogIncomingRequest {
  public async handle({ request }: HttpContextContract, next: () => Promise<void>) {
    // code for middleware goes here. ABOVE THE NEXT CALL
    const method = request.method()
    const path = request.url(true)
    const start = new Date().getTime()
    const ip = request.ip()

    await next()

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
