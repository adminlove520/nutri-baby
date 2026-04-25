import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        component: () => import('../layout/MainLayout.vue'),
        children: [
            {
                path: '',
                name: 'Home',
                component: () => import('../views/Home.vue'),
            },
            {
                path: 'timeline',
                name: 'Timeline',
                component: () => import('../views/Timeline.vue'),
            },
            {
                path: 'statistics',
                name: 'Statistics',
                component: () => import('../views/Statistics.vue'),
            },
            {
                path: 'user',
                name: 'User',
                component: () => import('../views/User.vue'),
            },
            {
                path: 'baby/list',
                name: 'BabyList',
                component: () => import('../views/baby/List.vue'),
            },
            {
                path: 'baby/edit/:id?',
                name: 'BabyEdit',
                component: () => import('../views/baby/Edit.vue'),
            },
            {
                path: 'baby/invite/:id',
                name: 'BabyInvite',
                component: () => import('../views/baby/Invite.vue'),
            },
            {
                path: 'record/feeding',
                name: 'FeedingRecord',
                component: () => import('../views/record/Feeding.vue'),
            },
            {
                path: 'record/sleep',
                name: 'SleepRecord',
                component: () => import('../views/record/Sleep.vue'),
            },
            {
                path: 'record/diaper',
                name: 'DiaperRecord',
                component: () => import('../views/record/Diaper.vue'),
            },
            {
                path: 'record/growth',
                name: 'GrowthRecord',
                component: () => import('../views/record/Growth.vue'),
            },
            {
                path: 'record/growth-album',
                name: 'GrowthAlbum',
                component: () => import('../views/record/GrowthAlbum.vue'),
            },
            {
                path: 'gallery',
                name: 'Gallery',
                component: () => import('../views/Gallery.vue'),
            },
            {
                path: 'record/gallery',
                name: 'TimelineGallery',
                component: () => import('../views/record/GrowthAlbum.vue'),
            },
            {
                path: 'vaccine',
                name: 'Vaccine',
                component: () => import('../views/Vaccine.vue'),
            },
            {
                path: 'notifications',
                name: 'Notifications',
                component: () => import('../views/Notifications.vue'),
            },
            {
                path: 'about',
                name: 'About',
                component: () => import('../views/About.vue'),
            },
            {
                path: 'settings',
                name: 'Settings',
                component: () => import('../views/Settings.vue'),
            }
        ]
    },
    {
        path: '/chat',
        name: 'Chat',
        component: () => import('../views/Chat.vue'),
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue'),
    },
    {
        path: '/reset-password',
        name: 'ResetPassword',
        component: () => import('../views/ResetPassword.vue'),
    },
    {
        path: '/join',
        name: 'JoinFamily',
        component: () => import('../views/baby/JoinFamily.vue'),
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    if (to.name !== 'Login' && to.name !== 'JoinFamily' && !token) {
        next({ name: 'Login' })
    } else {
        next()
    }
})

export default router
