// src/router/academy.routes.js
export default [
    // públicas
    { path: '/', name: 'AcademyHome', component: () => import('@/views/Academy/Home.vue'), meta: { requiresAuth: false } },
    { path: '/login', name: 'AcademyLogin', component: () => import('@/views/Academy/Login.vue'), meta: { requiresAuth: false } },

    // privadas (shell)
    {
        path: '/',
        component: () => import('@/views/Academy/layouts/AcademyShell.vue'),
        meta: { requiresAuth: true },
        children: [
            { path: 'panel', name: 'AcademyPanel', component: () => import('@/views/Academy/Panel.vue'), meta: { requiresAuth: true } },

            { path: 'kb', name: 'AcademyKB', component: () => import('@/views/Academy/KB/Index.vue'), meta: { requiresAuth: true } },
            { path: 'kb/editor', name: 'AcademyKBEditor', component: () => import('@/views/Academy/KB/Editor.vue'), meta: { requiresAuth: true } },
            { path: 'kb/editor/:id', name: 'AcademyKBEditorEdit', component: () => import('@/views/Academy/KB/Editor.vue'), props: true, meta: { requiresAuth: true } },
            { path: 'kb/my-articles', name: 'AcademyKBArticles', component: () => import('@/views/Academy/KB/Articles.vue'), meta: { requiresAuth: true } },
            { path: 'kb/:categorySlug', name: 'AcademyKBCategory', component: () => import('@/views/Academy/KB/Index.vue'), props: true, meta: { requiresAuth: true } },
            { path: 'kb/:categorySlug/:articleSlug', name: 'AcademyKBArticle', component: () => import('@/views/Academy/KB/Article.vue'), props: true, meta: { requiresAuth: true } },

            { path: 'me', name: 'AcademyMe', component: () => import('@/views/Academy/Me.vue'), meta: { requiresAuth: true } },

            { path: 'community', name: 'AcademyCommunity', component: () => import('@/views/Academy/Community/Index.vue'), meta: { requiresAuth: true } },
            { path: 'community/my', name: 'AcademyCommunityMyTopics', component: () => import('@/views/Academy/Community/MyTopics.vue'), meta: { requiresAuth: true } },
            { path: 'community/my/:id(\\d+)', name: 'AcademyCommunityTopicManage', component: () => import('@/views/Academy/Community/TopicManage.vue'), props: true, meta: { requiresAuth: true } },
            { path: 'community/:type', name: 'AcademyCommunityType', component: () => import('@/views/Academy/Community/Type.vue'), props: true, meta: { requiresAuth: true } },
            { path: 'community/topic/:id', name: 'AcademyCommunityTopic', component: () => import('@/views/Academy/Community/Topic.vue'), props: true, meta: { requiresAuth: true } },

            { path: 'tracks', name: 'AcademyTracks', component: () => import('@/views/Academy/Tracks/Index.vue'), meta: { requiresAuth: true } },
            { path: 'tracks/:trackSlug', name: 'AcademyTrackDetail', component: () => import('@/views/Academy/Tracks/Detail.vue'), props: true, meta: { requiresAuth: true } },

            { path: 'admin', name: 'AcademyAdmin', component: () => import('@/views/Academy/Admin/Index.vue'), meta: { requiresAuth: true, allowedRole: 'admin' } },
            { path: 'admin/tracks', name: 'AcademyTracksAdmin', component: () => import('@/views/Academy/Admin/Tracks/Index.vue'), meta: { requiresAuth: true, allowedRole: 'admin' } },
            { path: 'admin/tracks/new', name: 'AcademyTracksAdminCreate', component: () => import('@/views/Academy/Admin/Tracks/Create.vue'), meta: { requiresAuth: true, allowedRole: 'admin' } },
            { path: 'admin/tracks/:slug', name: 'AcademyTracksAdminDetail', component: () => import('@/views/Academy/Admin/Tracks/Detail.vue'), props: true, meta: { requiresAuth: true, allowedRole: 'admin' } },

            { path: 'users', name: 'AcademyUsers', component: () => import('@/views/Academy/Users/Index.vue'), meta: { requiresAuth: true } },
            { path: 'users/:id', name: 'AcademyUserProfile', component: () => import('@/views/Academy/Users/Profile.vue'), props: true, meta: { requiresAuth: true } },
        ],
    },
];
