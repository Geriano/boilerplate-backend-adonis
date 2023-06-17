import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { readdir } from 'fs/promises'

type Recursive = Record<string, Record<string, Record<string, string> | string> | string>

export default class TranslationController {
  /**
   * @swagger
   * /translation:
   *  get:
   *    summary: Get available translation
   *    tags:
   *      - Translation
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: array
   *              items:
   *                type: string
   *                example: en
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async index({ response }: HttpContextContract) {
    try {
      const disks = await readdir(Application.resourcesPath('/lang'), { withFileTypes: true })

      return response.ok(disks.filter((disk) => disk.isDirectory()).map((disk) => disk.name))
    } catch (e) {
      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  /**
   * @swagger
   * /translation/{lang}:
   *  get:
   *    summary: Get list available translation by language
   *    tags:
   *      - Translation
   *    parameters:
   *      - name: lang
   *        in: path
   *        required: true
   *        description: Language
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: array
   *              items:
   *                type: string
   *                example: messages
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async list({ response, params }: HttpContextContract) {
    try {
      const { id } = params
      const path = Application.resourcesPath(`/lang/${id}`)

      if (!existsSync(path)) {
        return response.notFound()
      }

      const disks = await readdir(path, { withFileTypes: true })

      return response.ok(
        disks
          .filter((disk) => disk.isFile() && disk.name.endsWith('.json'))
          .map(({ name }) => name.substring(0, name.length - 5))
      )
    } catch (e) {
      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  /**
   * @swagger
   * /translation/{lang}/{list}:
   *  get:
   *    summary: Get available translation in list
   *    tags:
   *      - Translation
   *    parameters:
   *      - name: lang
   *        in: path
   *        required: true
   *        description: Language
   *      - name: list
   *        in: path
   *        required: true
   *        description: List name
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                key:
   *                  type: string
   *                  example: value
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async show({ response, params }: HttpContextContract) {
    try {
      const { id, name } = params
      const path = Application.resourcesPath(`/lang/${id}/${name}.json`)

      if (!existsSync(path)) {
        return response.notFound()
      }

      const source = JSON.parse(readFileSync(path).toString())

      return response.ok(source)
    } catch (e) {
      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  /**
   * @swagger
   * /translation/{lang}/{list}:
   *  put:
   *    summary: Update translation value
   *    tags:
   *      - Translation
   *    security:
   *      - csrf: []
   *    parameters:
   *      - name: lang
   *        in: path
   *        required: true
   *        description: Language
   *      - name: list
   *        in: path
   *        required: true
   *        description: List name
   *    requestBody:
   *      required: true
   *      content:
   *        multipart/form-data:
   *          schema:
   *            type: object
   *            properties:
   *              key:
   *                type: string
   *                example: value
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                key:
   *                  type: string
   *                  example: value
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async update({ request, response, params }: HttpContextContract) {
    const body = request.body() as Recursive
    const { id, name } = params
    const path = Application.resourcesPath(`/lang/${id}/${name}.json`)

    try {
      if (existsSync(path)) {
        writeFileSync(path, JSON.stringify(body, null, 2))

        await this.saming(id, name, body)

        const translation = readFileSync(path).toString()

        return response.ok(JSON.parse(translation))
      }
    } catch (e) {
      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  private async saming(id: string, name: string, body: Recursive) {
    const disks = await readdir(Application.resourcesPath('/lang'), { withFileTypes: true })

    for (const disk of disks) {
      if (disk.isDirectory() && disk.name !== id) {
        const path = Application.resourcesPath(`/lang/${disk.name}`)
        const subDisks = await readdir(path, { withFileTypes: true })

        for (const subDisk of subDisks) {
          if (subDisk.isFile() && subDisk.name === `${name}.json`) {
            const filepath = Application.resourcesPath(`/lang/${disk.name}/${subDisk.name}`)
            const source = readFileSync(filepath).toString()
            const translation = this.merge(body, JSON.parse(source))

            writeFileSync(filepath, JSON.stringify(translation, null, 2))
          }
        }
      }
    }
  }

  private merge(a: Record<string, any>, b: Record<string, any>) {
    for (const key of Object.keys(a)) {
      if (b.hasOwnProperty(key)) {
        if (typeof a[key] !== 'string') {
          b[key] = this.merge(a[key], b[key])
        }
      } else {
        b[key] = a[key]
      }
    }

    return b
  }
}
