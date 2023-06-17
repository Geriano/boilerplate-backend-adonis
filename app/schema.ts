/**
 * @swagger
 * components:
 *  schemas:
 *    PaginationMetaSchema:
 *      type: object
 *      properties:
 *        total:
 *          type: number
 *          example: 1
 *          required: false
 *          default: 1
 *        per_page:
 *          type: number
 *          example: 1
 *          required: false
 *          default: 1
 *        current_page:
 *          type: number
 *          example: 1
 *          required: false
 *          default: 1
 *        last_page:
 *          type: number
 *          example: 1
 *          required: false
 *          default: 1
 *        first_page:
 *          type: number
 *          example: 1
 *          required: false
 *          default: 1
 *        last_page_url:
 *          type: string
 *          example: /?page=10
 *          required: false
 *        first_page_url:
 *          type: string
 *          example: /?page=1
 *          required: false
 *        next_page_url:
 *          type: string
 *          example: /?page=1
 *          required: false
 *        previous_page_url:
 *          type: string
 *          example: /?page=1
 *          required: false
 *
 *    ValidationError:
 *      type: object
 *      properties:
 *        field:
 *          type: string
 *          example: name
 *        error:
 *          type: string
 *          example: field name is required
 *
 *    ValidationErrors:
 *      type: array
 *      items:
 *        $ref: '#/components/schemas/ValidationError'
 *
 *    InternalServerError:
 *      type: object
 *      properties:
 *        message:
 *          type: string
 *          example: Internal Server Error
 *
 *    NotFound:
 *      type: object
 *      properties:
 *        message:
 *          type: string
 *          example: Not Found
 *
 *    Unauthorized:
 *      type: object
 *      properties:
 *        errors:
 *          type: array
 *          items:
 *            type: object
 *            properties:
 *              message:
 *                type: string
 *                example: Unauthorized
 *
 *    PageExpired:
 *      type: object
 *      properties:
 *        message:
 *          type: string
 *          example: Page Expired
 */
