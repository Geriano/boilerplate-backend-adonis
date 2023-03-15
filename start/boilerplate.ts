/* eslint-disable prettier/prettier */
import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.any('/', 'AuthController.user').as('current')
    Route.post('/has-permission', 'AuthController.hasPermission').as('has.permission')
    Route.post('/has-role', 'AuthController.hasRole').as('has.role')
    Route.post('/can', 'AuthController.can').as('can')
  }).prefix('/user').as('user')

  Route.group(() => {
    Route.group(() => {
      Route.put('/', 'AuthController.updateProfileInformation').as('update.profile.information')
      Route.patch('/', 'AuthController.updatePassword').as('update.password')
      Route.delete('/', 'AuthController.removeProfilePhoto').as('remove.profile.photo')
    }).prefix('/user').as('user')
  }).prefix('/auth').as('auth')

  Route.group(() => {
    Route.resource('permission', 'Superuser/PermissionController').apiOnly()
    Route.resource('role', 'Superuser/RoleController').apiOnly()
    Route.resource('user', 'Superuser/UserController').apiOnly()
    Route.get('role/all', 'Superuser/RoleController.all').middleware(['permission:read role']).as('role.all')
    Route.put('role/:role/toggle-permission/:permission', 'Superuser/RoleController.togglePermission').middleware(['permission:update role']).as('role.toggle.permission')

    Route.group(() => {
      Route.put('/password', 'Superuser/UserController.updatePassword').middleware(['permission:update user']).as('update.password')
      Route.put('/permission/:permission', 'Superuser/UserController.togglePermission').middleware(['permission:update user']).as('toggle.permission')
      Route.put('/role/:role', 'Superuser/UserController.toggleRole').middleware(['permission:update user']).as('toggle.role')
    }).prefix('/user/:user').as('user')
  }).prefix('/superuser').as('superuser')

  Route.get('_config', 'AppConfigurationController.index').middleware(['role:superuser,developer']).as('app.config')
}).middleware(['auth'])

Route.group(() => {
  Route.get('/', 'TranslationController.index').as('index')
  Route.get('/:id', 'TranslationController.list').as('list')
  Route.get('/:id/:name', 'TranslationController.show').as('show')
  Route.put('/:id/:name', 'TranslationController.update').as('update')
}).prefix('/translation').as('translation')

Route.get('/incoming-request/average', 'IncomingRequestController.average').as('average.incoming.request')

Route.post('/login', 'LoginController.process').as('login')
Route.delete('/logout', 'LogoutController.process').as('logout').middleware(['auth'])
Route.post('/register', 'RegisterController.process').as('register')
Route.get('/verify', 'RegisterController.verify').as('verify')
Route.post('/forgot-password', 'ForgotPasswordController.request').as('forgot.password.request')
Route.put('/forgot-password', 'ForgotpasswordController.reset').as('forgot.password.reset')
Route.post('/csrf', 'CsrfTokenController.generate').as('csrf')
