import I18n from '@ioc:Adonis/Addons/I18n'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

/**
 * The middleware detects the user language using the "Accept-language" HTTP header
 * or the "lang" query string parameter.
 *
 * Feel free to change the middleware implementation to what suits your needs. Just
 * make sure
 *
 * - You always ensure the user selected language is supported by your app.
 * - Only call "switchLocale" when the detected language is valid string value and
 *   not "null" or "undefined"
 */
export default class DetectUserLocale {
  /**
   * Detect user language using "Accept-language" header or
   * the "lang" query string parameter.
   *
   * The user language must be part of the "supportedLocales", otherwise
   * this method should return null.
   */
  protected getUserLanguage(context: HttpContextContract) {
    const availableLocales = I18n.supportedLocales()
    const request = context.request.input('lang')

    if (request) {
      return context.request.language([request])
    }

    return context.request.language(availableLocales)
  }

  /**
   * Handle method is called by AdonisJS automatically on every middleware
   * class.
   */
  public async handle(context: HttpContextContract, next: () => Promise<void>) {
    const language = this.getUserLanguage(context)

    /**
     * Switch locale when we are able to detect the user language and it
     * is supported by the application
     */
    if (language) {
      context.i18n.switchLocale(language)
    }

    await next()
  }
}