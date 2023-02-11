import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.get('/', 'Superuser/PermissionController.all')
      .as('all')
      .middleware(['permission:read permission'])
    Route.post('/', 'Superuser/PermissionController.store')
      .as('store')
      .middleware(['permission:create permission'])
    Route.put('/:id', 'Superuser/PermissionController.update')
      .as('update')
      .middleware(['permission:update permission'])
    Route.delete('/:id', 'Superuser/PermissionController.destroy')
      .as('destroy')
      .middleware(['permission:delete permission'])
  })
    .prefix('/permission')
    .as('permission')

  Route.group(() => {
    Route.get('/', 'Superuser/RoleController.paginate')
      .as('paginate')
      .middleware(['permission:read role'])
    Route.post('/', 'Superuser/RoleController.store')
      .as('store')
      .middleware(['permission:create role'])
    Route.get('/all', 'Superuser/RoleController.all').as('all').middleware(['permission:read role'])
    Route.get('/:id', 'Superuser/RoleController.show')
      .as('show')
      .middleware(['permission:read role'])
    Route.put('/:id', 'Superuser/RoleController.update')
      .as('update')
      .middleware(['permission:update role'])
    Route.delete('/:id', 'Superuser/RoleController.destroy')
      .as('destroy')
      .middleware(['permission:delete role'])
  })
    .prefix('/role')
    .as('role')

  Route.group(() => {
    Route.get('/', 'Superuser/UserController.paginate')
      .as('paginate')
      .middleware(['permission:read user'])
    Route.post('/', 'Superuser/UserController.store')
      .as('store')
      .middleware(['permission:create user'])
    Route.get('/:id', 'Superuser/UserController.show')
      .as('show')
      .middleware(['permission:read user'])
    Route.put('/:id', 'Superuser/UserController.update')
      .as('update')
      .middleware(['permission:update user'])
    Route.put('/:id/password', 'Superuser/UserController.updatePassword')
      .as('update.password')
      .middleware(['permission:update user'])
    Route.delete('/:id', 'Superuser/UserController.destroy')
      .as('destroy')
      .middleware(['permission:delete user'])
  })
    .prefix('/user')
    .as('user')
})
  .prefix('/superuser')
  .as('superuser')
  .middleware(['auth'])

Route.group(() => {
  Route.get('/average', 'IncomingRequestController.average').as('average')
})
  .prefix('/incoming-request')
  .as('incoming-request')

Route.group(() => {
  Route.any('/', 'AuthController.user').as('current')
  Route.post('/has-permission', 'AuthController.hasPermission').as('has-permission')
  Route.post('/has-role', 'AuthController.hasRole').as('has-role')
  Route.post('/can', 'AuthController.can').as('can')
})
  .middleware(['auth'])
  .prefix('/user')
  .as('user')
Route.post('/login', 'LoginController.process').as('login')
Route.delete('/logout', 'LogoutController.process').as('logout').middleware(['auth'])
