import { bind } from '@adonisjs/route-model-binding'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { __, send, transaction, validate } from 'App/helpers'
import Permission from 'App/Models/Permission'

export default class PermissionController {
  /**
   * @swagger
   * /superuser/permission:
   *  get:
   *    summary: Get all permission
   *    tags:
   *      - Master Permission
   *    security:
   *      - token: []
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
   *                $ref: '#/components/schemas/Permission'
   *      401:
   *        description: Unauthorized
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/Unauthorized'
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async index() {
    return send(Permission.query().select(['id', 'name', 'key']).exec())
  }

  /**
   * @swagger
   * /superuser/permission:
   *  post:
   *    summary: Create permission
   *    tags:
   *      - Master Permission
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    requestBody:
   *      required: true
   *      content:
   *        multipart/form-data:
   *          schema:
   *            type: object
   *            properties:
   *              name:
   *                type: string
   *                example: create user
   *              key:
   *                type: string
   *                example: create user
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
   *                permission:
   *                  $ref: '#/components/schemas/Permission'
   *      401:
   *        description: Unauthorized
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/Unauthorized'
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
  public async store() {
    const { name, key } = await validate({
      name: schema.string.nullableAndOptional({ trim: true }),
      key: schema.string({ trim: true }, [
        rules.unique({
          table: Permission.table,
          column: 'key',
        }),
      ]),
    })

    return transaction(async () => {
      const permission = await Permission.create({ name, key })

      return {
        message: __('messages.permission.created', {
          title: permission.title,
        }),
        permission,
      }
    })
  }

  /**
   * @swagger
   * /superuser/permission/{id}:
   *  put:
   *    summary: Update permission
   *    tags:
   *      - Master Permission
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: Permission id
   *        example: 46363e02-4c62-4482-a47d-0d08035824d8
   *    requestBody:
   *      required: true
   *      content:
   *        multipart/form-data:
   *          schema:
   *            type: object
   *            properties:
   *              name:
   *                type: string
   *                example: create user
   *              key:
   *                type: string
   *                example: create user
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
   *                permission:
   *                  $ref: '#/components/schemas/Permission'
   *      401:
   *        description: Unauthorized
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/Unauthorized'
   *      404:
   *        description: Not Found
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/NotFound'
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
  @bind()
  public async update(_, permission: Permission) {
    const { name, key } = await validate({
      name: schema.string.nullableAndOptional({ trim: true }),
      key: schema.string({ trim: true }, [
        rules.unique({
          table: Permission.table,
          column: 'key',
          whereNot: {
            id: permission.$attributes.id,
          },
        }),
      ]),
    })

    return transaction(async () => {
      permission.key = key
      name !== undefined && (permission.name = name)
      await permission.save()

      return {
        message: __('messages.permission.updated', {
          title: permission.title,
        }),
        permission,
      }
    })
  }

  /**
   * @swagger
   * /superuser/permission/{id}:
   *  delete:
   *    summary: Delete permission
   *    tags:
   *      - Master Permission
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: Permission id
   *        example: 46363e02-4c62-4482-a47d-0d08035824d8
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
   *                permission:
   *                  $ref: '#/components/schemas/Permission'
   *      401:
   *        description: Unauthorized
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/Unauthorized'
   *      404:
   *        description: Not Found
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/NotFound'
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
  @bind()
  public async destroy(_, permission: Permission) {
    return transaction(async () => {
      await permission.delete()

      return {
        message: __('messages.permission.deleted', {
          title: permission.title,
        }),
        permission,
      }
    })
  }
}
