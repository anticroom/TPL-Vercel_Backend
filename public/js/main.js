import routes from './routes.js';

// 1. Setup Store
export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});


router.beforeEach((to, from, next) => {
    let title = "The Piss List";

    // Change title based on route
    if (to.path === '/leaderboard') title = "Leaderboard | TPL";
    else if (to.path === '/roulette') title = "Roulette | TPL";
    else if (to.path === '/admin') title = "Admin Panel LOGIN | TPL";
    else if (to.path === '/manage') title = "Admin management LOGIN | TPL";

    document.title = title;
    next();
});

// 4. Create and Mount App
const app = Vue.createApp({
    data: () => ({ store }),
});

app.use(router);
app.mount('#app');