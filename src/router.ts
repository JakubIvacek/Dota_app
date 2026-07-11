import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/search', name: 'search', component: () => import('./views/SearchView.vue') },
    { path: '/leaderboard', name: 'leaderboard', component: () => import('./views/LeaderboardView.vue') },
    {
      path: '/player/:accountId',
      component: () => import('./views/PlayerView.vue'),
      children: [
        { path: '', name: 'player-overview', component: () => import('./views/DashboardView.vue') },
        { path: 'matches', name: 'player-matches', component: () => import('./views/MatchesView.vue') },
        { path: 'heroes', name: 'player-heroes', component: () => import('./views/HeroesView.vue') },
      ],
    },
    { path: '/matches/:id', name: 'match-detail', component: () => import('./views/MatchDetailView.vue') },
    { path: '/terms', name: 'terms', component: () => import('./views/TermsView.vue') },
    { path: '/privacy', name: 'privacy', component: () => import('./views/PrivacyView.vue') },
  ],
})
