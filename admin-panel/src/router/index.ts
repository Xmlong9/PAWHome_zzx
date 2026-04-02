import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue')
    },
    {
      path: '/',
      name: 'Layout',
      component: () => import('../layout/Layout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue')
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('../views/users/UserList.vue')
        },
        {
          path: 'posts',
          name: 'Posts',
          component: () => import('../views/content/PostList.vue')
        },
        {
          path: 'comments',
          name: 'Comments',
          component: () => import('../views/content/CommentList.vue')
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('../views/shop/ProductList.vue')
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import('../views/shop/OrderList.vue')
        },
        {
          path: 'appointments',
          name: 'Appointments',
          component: () => import('../views/services/AppointmentList.vue')
        },
        {
          path: 'system/admins',
          name: 'Admins',
          component: () => import('../views/system/AdminList.vue')
        },
        {
          path: 'system/logs',
          name: 'AuditLogs',
          component: () => import('../views/system/AuditLogs.vue')
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router