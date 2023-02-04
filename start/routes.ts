/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.get('/', async () => {
  return { hello: 'world' }
})

Route.group(() => {
  Route.group(() => {
    Route.get('/', 'Superuser/PermissionController.all').as('all')
    Route.post('/', 'Superuser/PermissionController.store').as('store')
    Route.post('/multiple', 'Superuser/PermissionController.multiple').as('stores')
    Route.put('/:id', 'Superuser/PermissionController.update').as('update-put')
    Route.patch('/:id', 'Superuser/PermissionController.update').as('update-patch')
    Route.delete('/:id', 'Superuser/PermissionController.destroy').as('destroy')
  })
    .prefix('/permission')
    .as('permission')
})
  .prefix('/superuser')
  .as('superuser')
