import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
    { path: '/matches', name: 'matches', component: () => import('./views/MatchesView.vue') },
    { path: '/matches/:id', name: 'match-detail', component: () => import('./views/MatchDetailView.vue') },
    { path: '/heroes', name: 'heroes', component: () => import('./views/HeroesView.vue') },
  ],
})
