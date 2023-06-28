/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable prettier/prettier */
import { HttpContext } from '@adonisjs/core/build/standalone'
import { CastableHeader } from '@ioc:Adonis/Core/Response'
import { TypedSchema, schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'

export const context = () => HttpContext.get()!
export const auth = () => context().auth
export const i18n = () => context().i18n
export const logger = () => context().logger
export const request = () => context().request
export const response = () => context().response

export async function send<T>(body: T, code: number = 200, headers: Record<string, CastableHeader> = {}) {
  if (!body) {
    return
  }
  
  const builder = response()

  for (const key in headers) {
    builder.header(key, headers[key])
  }

  if (body instanceof Promise) {
    try {
      return send(await body, code, headers)
    } catch (e) {
      return send({ message: e.message, ...JSON.parse(JSON.stringify(e)) }, 500, headers)
    }
  } else if (typeof body === 'function') {
    return send(body(), code)
  }

  return builder.status(code).send(body)
}

export async function validate<T extends TypedSchema>(rules: T): Promise<{ [P in keyof T]: T[P]['t'] }> {
  return await request().validate({ schema: schema.create(rules) })
}

export async function transaction<T extends () => Promise<any>>(callback: T, code: number = 200) {
  const transaction = await Database.beginGlobalTransaction()

  try {
    const result = await callback()
    await transaction.commit()

    return send(result, code)
  } catch (e) {
    await transaction.rollback()
    
    return send({
      message: e.message,
    }, 500)
  }
}

export const __ = (key: string, bind?: Record<string, any>) => i18n().formatMessage(key, bind)
