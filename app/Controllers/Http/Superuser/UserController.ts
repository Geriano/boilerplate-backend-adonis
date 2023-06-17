import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { DateTime } from 'luxon'
import { __, response, send, transaction, validate } from 'App/helpers'
import { bind } from '@adonisjs/route-model-binding'
import User from 'App/Models/User'
import Role from 'App/Models/Role'
import Permission from 'App/Models/Permission'

export default class UserController {
  /**
   * @swagger
   * /superuser/user:
   *  get:
   *    summary: User pagination
   *    tags:
   *      - Master User
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
   *                    $ref: '#/components/schemas/User'
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
        key: schema.enum(['name', 'email', 'username']),
      }),
    })

    return send(
      User.query()
        .where((query) => {
          const s = `%${search || ''}%`
          query.orWhereILike('name', s).orWhereILike('email', s).orWhereILike('username', s)
        })
        .orderBy(order.key, order.dir as 'asc' | 'desc')
        .preload('permissions', (query) => query.select(['id', 'name', 'key']))
        .preload('roles', (query) => query.select(['id', 'name', 'key']))
        .paginate(page, limit)
    )
  }

  /**
   * @swagger
   * components:
   *  schemas:
   *    UserCreatePayload:
   *      type: object
   *      properties:
   *        name:
   *          type: string
   *          example: John
   *          required: true
   *        email:
   *          type: string
   *          example: john@local.app
   *          required: true
   *        username:
   *          type: string
   *          example: john
   *          required: true
   *        password:
   *          type: string
   *          example: password
   *          required: true
   *        password_confirmation:
   *          type: string
   *          example: John
   *          required: true
   *    UserUpdatePayload:
   *      type: object
   *      properties:
   *        name:
   *          type: string
   *          example: John
   *          required: true
   *        email:
   *          type: string
   *          example: john@local.app
   *          required: true
   *        username:
   *          type: string
   *          example: john
   *          required: true
   *    UserPasswordPayload:
   *      type: object
   *      properties:
   *        password:
   *          type: string
   *          example: password
   *          required: true
   *        password_confirmation:
   *          type: string
   *          example: password
   *          required: true
   */
  private async validate(update?: User) {
    const option = { trim: true }
    const email = [
      rules.unique({
        table: User.table,
        column: 'email',
        whereNot: !update?.email
          ? undefined
          : {
              email: update.email,
            },
      }),
      rules.normalizeEmail({
        allLowercase: true,
      }),
      rules.minLength(1),
    ]
    const username = [
      rules.unique({
        table: User.table,
        column: 'username',
        whereNot: !update?.username
          ? undefined
          : {
              username: update.username,
            },
      }),
      rules.minLength(2),
      rules.maxLength(64),
    ]
    const password = [rules.minLength(8), rules.maxLength(255), rules.trim()]
    const passwordConfirmation = [rules.confirmed('password')]

    return await validate({
      name: schema.string(option),
      email: schema.string(option, email),
      username: schema.string(option, username),
      password: update ? schema.string.optional(password) : schema.string(option, password),
      password_confirmation: update
        ? schema.string.optional(passwordConfirmation)
        : schema.string(option, passwordConfirmation),
      permissions: schema.array.optional().members(
        schema.string([
          rules.exists({
            table: Permission.table,
            column: 'key',
          }),
        ])
      ),
      roles: schema.array.optional().members(
        schema.string([
          rules.exists({
            table: Role.table,
            column: 'key',
          }),
        ])
      ),
    })
  }

  /**
   * @swagger
   * /superuser/user:
   *  post:
   *    summary: Create user
   *    tags:
   *      - Master User
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
   *            $ref: '#/components/schemas/UserCreatePayload'
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
   *                user:
   *                  $ref: '#/components/schemas/User'
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
    const { name, email, username, password, roles, permissions } = await this.validate()

    return transaction(async () => {
      const user = await User.create({
        name,
        email,
        username,
        password,
        emailVerifiedAt: DateTime.now(),
      })

      if (Array.isArray(permissions)) {
        await user.related('permissions').attach(
          await Permission.query()
            .whereIn('key', permissions)
            .then((permissions) => permissions.map((permission) => permission.id))
        )
      }

      if (Array.isArray(roles)) {
        await user.related('roles').attach(
          await Permission.query()
            .whereIn('key', roles)
            .then((roles) => roles.map((role) => role.id))
        )
      }

      await user.load('permissions')
      await user.load('roles')

      return response().created({
        message: __('messages.user.created', {
          title: user.name,
        }),
        user,
      })
    })
  }

  /**
   * @swagger
   * /superuser/user/{id}:
   *  get:
   *    summary: Show user by id
   *    tags:
   *      - Master User
   *    security:
   *      - token: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: User id
   *        example: 46363e02-4c62-4482-a47d-0d08035824d8
   *    responses:
   *      200:
   *        description: OK
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/User'
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
  public async show(_, user: User) {
    await user.load('permissions')
    await user.load('roles')

    return user
  }

  /**
   * @swagger
   * /superuser/user/{id}:
   *  put:
   *    summary: Update user general information by id
   *    tags:
   *      - Master User
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: User id
   *        example: 46363e02-4c62-4482-a47d-0d08035824d8
   *    requestBody:
   *      required: true
   *      content:
   *        multipart/form-data:
   *          schema:
   *            $ref: '#/components/schemas/UserUpdatePayload'
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
   *                user:
   *                  $ref: '#/components/schemas/User'
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
  public async update(_, user: User) {
    const { name, email, username, roles, permissions } = await this.validate(user)

    return transaction(async () => {
      user.name = name
      user.email = email
      user.username = username
      await user.save()

      if (Array.isArray(permissions)) {
        await user.related('permissions').sync(
          await Permission.query()
            .whereIn('key', permissions)
            .then((permissions) => permissions.map((permission) => permission.id))
        )
      }

      if (Array.isArray(roles)) {
        await user.related('roles').sync(
          await Permission.query()
            .whereIn('key', roles)
            .then((roles) => roles.map((role) => role.id))
        )
      }

      await user.load('permissions')
      await user.load('roles')

      return {
        message: __('messages.user.updated', {
          title: user.name,
        }),
        user,
      }
    })
  }

  /**
   * @swagger
   * /superuser/user/{id}/password:
   *  put:
   *    summary: Update user password by id
   *    tags:
   *      - Master User
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: User id
   *        example: 46363e02-4c62-4482-a47d-0d08035824d8
   *    requestBody:
   *      required: true
   *      content:
   *        multipart/form-data:
   *          schema:
   *            $ref: '#/components/schemas/UserPasswordPayload'
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
  public async updatePassword(_, user: User) {
    const { password } = await validate({
      password: schema.string({ trim: true }, [
        rules.minLength(8),
        rules.maxLength(255),
        rules.trim(),
      ]),
      password_confirmation: schema.string({ trim: true }, [rules.confirmed('password')]),
    })

    return transaction(async () => {
      user.password = password
      await user.save()

      return {
        message: __('messages.user.password updated'),
      }
    })
  }

  /**
   * @swagger
   * /superuser/user/{id}:
   *  delete:
   *    summary: Delete user by id
   *    tags:
   *      - Master User
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: User id
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
   *                user:
   *                  $ref: '#/components/schemas/User'
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
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  @bind()
  public async destroy(_, user: User) {
    return transaction(async () => {
      await user.delete()

      return {
        message: __('messages.user.deleted', {
          title: user.name,
        }),
        user,
      }
    })
  }

  /**
   * @swagger
   * /superuser/user/{id}/permission/{permission}:
   *  put:
   *    summary: Toggler user permission
   *    tags:
   *      - Master User
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: User id
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
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  @bind()
  public async togglePermission(_, user: User, permission: Permission) {
    return transaction(async () => {
      if (user.permissions.find((p) => permission.id === p.id)) {
        await user.related('permissions').detach([permission.id])
      } else {
        await user.related('permissions').attach([permission.id])
      }

      return {
        message: __('messages.user.updated', {
          title: user.name,
        }),
      }
    })
  }

  /**
   * @swagger
   * /superuser/user/{id}/role/{role}:
   *  put:
   *    summary: Toggler user role
   *    tags:
   *      - Master User
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        in: path
   *        required: true
   *        description: User id
   *        example: 46363e02-4c62-4482-a47d-0d08035824d8
   *      - name: role
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
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  @bind()
  public async toggleRole(_, user: User, role: Role) {
    return transaction(async () => {
      if (user.roles.find((r) => role.id === r.id)) {
        await user.related('roles').detach([role.id])
      } else {
        await user.related('roles').attach([role.id])
      }

      return {
        message: __('messages.user.updated', {
          title: user.name,
        }),
      }
    })
  }
}
