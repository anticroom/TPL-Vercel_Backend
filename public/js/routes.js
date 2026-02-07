import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Admin from './pages/Admin.js';
import Manage from './pages/manage.js';
import ListPacks from './pages/ListPacks.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/admin', component: Admin },
    { path: '/manage', component: Manage },
    { path: '/packs', component: ListPacks },
];
