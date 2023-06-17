import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { __, send, transaction, validate } from 'App/helpers'
import { bind } from '@adonisjs/route-model-binding'
import Role from 'App/Models/Role'
import Permission from 'App/Models/Permission'

export default class RoleController {
  /**
   * @swagger
   * /superuser/role/all:
   *  get:
   *    summary: Get all role
   *    tags:
   *      - Master Role
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
   *                $ref: '#/components/schemas/Role'
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
  public async all() {
    return send(async () => {
      const roles = await Role.all()

      return roles.map((role) => {
        const data = role.serialize()

        return {
          id: data.id,
          title: data.title,
          key: data.key,
        }
      })
    })
  }

  /**
   * @swagger
   * /superuser/role:
   *  get:
   *    summary: Role pagination
   *    tags:
   *      - Master Role
   *    security:
   *      - token: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: page
   *        in: query
   *        required: true
   *        example: 1
   *      - name: limit
   *        in: query
   *        required: true
   *        example: 10
   *      - name: search
   *        in: query
   *        required: false
   *      - name: order[dir]
   *        in: query
   *        required: true
   *        example: asc
   *      - name: order[key]
   *        in: query
   *        required: true
   *        example: name
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                meta:
   *                  $ref: '#/components/schemas/PaginationMetaSchema'
   *                data:
   *                  type: array
   *                  items:
   *                    $ref: '#/components/schemas/Role'
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
    const { page, limit, search, order } = await validate({
      page: schema.number(),
      limit: schema.number(),
      search: schema.string.optional(),
      order: schema.object().members({
        dir: schema.enum(['asc', 'desc']),
        key: schema.enum(['name', 'key']),
      }),
    })

    return send(
      Role.query()
        .where((query) => {
          const s = `%${search || ''}%`
          query.whereILike('name', s).orWhereILike('key', s)
        })
        .orderBy(order.key, order.dir as 'asc' | 'desc')
        .preload('permissions', (query) => query.select(['id', 'name', 'key']))
        .paginate(page, limit)
    )
  }

  /**
   * @swagger
   * /superuser/role:
   *  post:
   *    summary: Create role
   *    tags:
   *      - Master Role
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
   *                role:
   *                  $ref: '#/components/schemas/Role'
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
    const { name, key, permissions } = await validate({
      name: schema.string.nullableAndOptional({ trim: true }),
      key: schema.string({ trim: true }, [
        rules.unique({
          table: Role.table,
          column: 'key',
        }),
      ]),
      permissions: schema.array
        .nullableAndOptional()
        .members(schema.number([rules.exists({ table: Permission.table, column: 'id' })])),
    })

    return transaction(async () => {
      const role = await Role.create({ name, key })

      if (permissions) {
        await role.related('permissions').attach(
          await Permission.query()
            .whereIn('key', permissions)
            .select(['id'])
            .exec()
            .then((permissions) => permissions.map((permission) => permission.id))
        )
      }

      await role.load('permissions')

      return {
        message: __('messages.role.created', {
          title: role.title,
        }),
        role,
      }
    })
  }

  /**
   * @swagger
   * /superuser/role/{id}:
   *  get:
   *    summary: Get role by id
   *    tags:
   *      - Master Role
   *    security:
   *      - token: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: Role id
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
   *              $ref: '#/components/schemas/Role'
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
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  @bind()
  public async show(_, role: Role) {
    return role
  }

  /**
   * @swagger
   * /superuser/role/{id}:
   *  put:
   *    summary: Update role
   *    tags:
   *      - Master Role
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: Role id
   *        example: 46363e02-4c62-4482-a47d-0d08035824d8
   *      - name: payload
   *        in: body
   *        required: true
   *        schema:
   *          type: object
   *          properties:
   *            name:
   *              type: string
   *              example: create user
   *            key:
   *              type: string
   *              example: create user
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
   *                role:
   *                  $ref: '#/components/schemas/Role'
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
  public async update(_, role: Role) {
    const { name, key, permissions } = await validate({
      name: schema.string.nullableAndOptional({ trim: true }),
      key: schema.string({ trim: true }, [
        rules.unique({
          table: Role.table,
          column: 'key',
          whereNot: {
            id: role.id,
          },
        }),
      ]),
      permissions: schema.array
        .nullableAndOptional()
        .members(
          schema.string([
            rules.uuid({ version: 4 }),
            rules.exists({ table: Permission.table, column: 'id' }),
          ])
        ),
    })

    return transaction(async () => {
      role.key = key
      name !== undefined && (role.name = name)
      await role.save()

      if (Array.isArray(permissions)) {
        await role.related('permissions').sync(
          await Permission.query()
            .whereIn('key', permissions)
            .select(['id'])
            .exec()
            .then((permissions) => permissions.map((permission) => permission.id))
        )
      }

      return {
        message: __('messages.role.updated', {
          title: role.title,
        }),
        role,
      }
    })
  }

  /**
   * @swagger
   * /superuser/role/{id}:
   *  delete:
   *    summary: Delete role
   *    tags:
   *      - Master Role
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: Role id
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
   *                role:
   *                  $ref: '#/components/schemas/Role'
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
  public async destroy(_, role: Role) {
    return transaction(async () => {
      await role.delete()

      return {
        message: __('messages.role.deleted', {
          title: role.title,
        }),
        role,
      }
    })
  }

  /**
   * @swagger
   * /superuser/role/{id}/permission/{permission}:
   *  put:
   *    summary: Delete role
   *    tags:
   *      - Master Role
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: Role id
   *        example: 46363e02-4c62-4482-a47d-0d08035824d8
   *      - name: permission
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
   *                role:
   *                  $ref: '#/components/schemas/Role'
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
  public async togglePermission(_, role: Role, permission: Permission) {
    return transaction(async () => {
      if (role.permissions.find((p) => p.key === permission.key)) {
        await role.related('permissions').detach([permission.id])
      } else {
        await role.related('permissions').attach([permission.id])
      }

      return {
        message: __('messages.role.updated', {
          title: role.title,
        }),
        role,
      }
    })
  }
}
