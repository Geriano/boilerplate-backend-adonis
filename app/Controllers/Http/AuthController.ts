import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { string } from '@ioc:Adonis/Core/Helpers'
import { existsSync, unlinkSync } from 'fs'
import Application from '@ioc:Adonis/Core/Application'
import Permission from 'App/Models/Permission'
import Database from '@ioc:Adonis/Lucid/Database'
import Event from '@ioc:Adonis/Core/Event'
import Hash from '@ioc:Adonis/Core/Hash'
import Role from 'App/Models/Role'
import User from 'App/Models/User'
import RegisterController from './RegisterController'

export default class AuthController {
  /**
   * @swagger
   * /auth/user:
   *  get:
   *    summary: Get current authenticated user
   *    tags:
   *      - Authentication
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
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
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async user({ auth, response }: HttpContextContract) {
    const user = auth.user!

    return response.ok({
      ...user.serialize(),
      permissions: user.permissions.map(({ key }) => ({ key })),
      roles: user.roles.map(({ key, permissions }) => ({
        key,
        permissions: permissions.map(({ key }) => ({ key })),
      })),
    })
  }

  public async hasPermission({ auth, request, response }: HttpContextContract) {
    const { permissions } = await request.validate({
      schema: schema.create({
        permissions: schema.array().members(
          schema.string({ trim: true }, [
            rules.exists({
              table: Permission.table,
              column: 'key',
            }),
          ])
        ),
      }),
    })

    return response.status(auth.user!.hasPermission(permissions) ? 200 : 401)
  }

  public async hasRole({ auth, request, response }: HttpContextContract) {
    const { roles } = await request.validate({
      schema: schema.create({
        roles: schema.array().members(
          schema.string({ trim: true }, [
            rules.exists({
              table: Role.table,
              column: 'key',
            }),
          ])
        ),
      }),
    })

    return response.status(auth.user!.hasRole(roles) ? 200 : 401)
  }

  public async can({ auth, request, response }: HttpContextContract) {
    const abilities = request.input('abilities')

    if (Array.isArray(abilities)) {
      return response.status(auth.user!.can(abilities) ? 200 : 401)
    }

    return response.status(401)
  }

  /**
   * @swagger
   * /auth/user:
   *  put:
   *    summary: Update current user profile information
   *    tags:
   *      - Authentication
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
   *                required: true
   *                example: Ger
   *              email:
   *                type: string
   *                required: true
   *                example: ger@local.app
   *              next:
   *                type: string
   *                required: false
   *                example: http://localhost:3333/next
   *              photo:
   *                type: file
   *                required: false
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
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async updateProfileInformation({ auth, request, response, i18n }: HttpContextContract) {
    const user = auth.user!
    const option = { trim: true }
    const { name, username, email, next, photo } = await request.validate({
      schema: schema.create({
        name: schema.string(option),
        username: schema.string(option, [
          rules.unique({
            table: User.table,
            column: 'username',
            whereNot: {
              id: user.id,
            },
          }),
        ]),
        email: schema.string(option, [
          rules.unique({
            table: User.table,
            column: 'email',
            whereNot: {
              id: user.id,
            },
          }),
          rules.normalizeEmail({
            allLowercase: true,
          }),
          rules.email(),
        ]),
        next: schema.string.optional(option, [
          rules.url({
            requireProtocol: true,
          }),
          rules.requiredWhen('email', '!=', user.email),
        ]),
        photo: schema.file.nullableAndOptional({
          extnames: ['png', 'jpg', 'jpeg', 'webp'],
        }),
      }),
    })

    const transaction = await Database.beginGlobalTransaction()

    try {
      if (user.email !== email) {
        user.emailVerifiedAt = null
        const register = new RegisterController()
        register.send(user, next)
      }

      user.name = name
      user.username = username
      user.email = email

      if (photo?.isValid) {
        if (user.profilePhotoPath) {
          const path = Application.publicPath(user.profilePhotoPath)
          existsSync(path) && unlinkSync(path)
        }

        const random = string.generateRandom(32)
        const ext = photo.extname || ''
        const name = ext ? `${random}.${ext}` : random
        photo.move(Application.publicPath('/uploads'), {
          name,
          overwrite: true,
        })

        user.profilePhotoPath = `/uploads/${name}`
      }

      await user.save()
      await Event.emit('auth:profile-updated', user)
      await transaction.commit()

      return response.ok({
        message: i18n.formatMessage('messages.user.updated', {
          title: user.name,
        }),
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }

  /**
   * @swagger
   * /auth/user:
   *  delete:
   *    summary: Remove current user profile photo
   *    tags:
   *      - Authentication
   *    security:
   *      - token: []
   *      - csrf: []
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
  public async removeProfilePhoto({ auth, response, i18n }: HttpContextContract) {
    const user = auth.user!

    if (user.profilePhotoPath) {
      const path = Application.publicPath(user.profilePhotoPath)

      if (existsSync(path)) {
        const transaction = await Database.beginGlobalTransaction()

        try {
          unlinkSync(path)
          user.profilePhotoPath = null
          await user.save()
          await transaction.commit()
        } catch (e) {
          await transaction.rollback()

          return response.internalServerError({
            message: `${e.message}`,
          })
        }
      }
    }

    return response.ok({
      message: i18n.formatMessage('messages.user.updated', {
        title: user.name,
      }),
    })
  }

  /**
   * @swagger
   * /auth/user:
   *  patch:
   *    summary: Update current user password
   *    tags:
   *      - Authentication
   *    security:
   *      - token: []
   *      - csrf: []
   *    produces:
   *      - application/json
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              old_password:
   *                type: string
   *                required: true
   *                example: password
   *              password:
   *                type: string
   *                required: true
   *                example: password
   *              password_confirmation:
   *                type: string
   *                required: true
   *                example: password
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
   *      500:
   *        description: Internal Server Error
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/InternalServerError'
   */
  public async updatePassword({ auth, request, response, i18n }: HttpContextContract) {
    const option = { trim: true }
    const rule = [rules.minLength(8), rules.maxLength(255), rules.alphaNum()]
    const { old_password: oldPassword, password } = await request.validate({
      schema: schema.create({
        old_password: schema.string(option),
        password: schema.string(option, rule),
        password_confirmation: schema.string(option, [rules.confirmed('password')]),
      }),
    })

    const user = auth.user!

    const transaction = await Database.beginGlobalTransaction()

    try {
      if (await Hash.verify(user.password, oldPassword)) {
        user.password = password
        await user.save()
        await Event.emit('auth:password-updated', user)
        await transaction.commit()

        return response.ok({
          message: i18n.formatMessage('messages.user.password updated', {
            title: user.name,
          }),
        })
      }

      return response.unprocessableEntity({
        errors: [
          {
            field: 'old_password',
            message: i18n.formatMessage('messages.auth.login.wrong-password'),
          },
        ],
      })
    } catch (e) {
      await transaction.rollback()

      return response.internalServerError({
        message: `${e}`,
      })
    }
  }
}
