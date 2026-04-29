import routes from './routes.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    listType: localStorage.getItem('listType') || 'TPCL',

    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },

    setListType(type) {
        this.listType = type;
        localStorage.setItem('listType', type);
        this.updateTheme(type);
    },

    updateTheme(type) {
        const root = document.documentElement;
        const logo = document.querySelector('header .logo h2');

        if (type === 'TPL') {
            root.style.setProperty('--color-primary', '#feb33b');
            root.style.setProperty('--color-primary-level', '#ffd498');
            
            if (logo) {
                logo.innerText = logo.innerText.replace('TPCL', 'TPL');
                if (logo.innerText === 'The Piss List') logo.innerText = 'The Piss List'; 
                if (!logo.innerText.includes('TPL')) logo.innerText = 'TPL';
            }
        } else {
            root.style.removeProperty('--color-primary');
            root.style.removeProperty('--color-primary-level');

            if (logo) {
                logo.innerText = logo.innerText.replace('TPL', 'TPCL');
                if (logo.innerText === 'The Piss List') logo.innerText = 'The Piss List';
                if (!logo.innerText.includes('TPCL')) logo.innerText = 'TPCL';
            }
        }
    }
});

store.updateTheme(store.listType);

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    let title = "TPCL | The Piss List";

    const listPrefix = store.listType === 'TPL' ? 'TPL' : 'TPCL';
    const listName = store.listType === 'TPL' ? 'The Piss List' : 'The Piss List';

    if (to.path === '/' || to.params._id) title = `${listPrefix} | ${listName}`;
    else if (to.path === '/leaderboard') title = "Leaderboard | " + listPrefix;
    else if (to.path === '/roulette') title = "Roulette | " + listPrefix;
    else if (to.path === '/admin') title = "Admin Panel | " + listPrefix;
    else if (to.path === '/manage') title = "Management Panel | " + listPrefix;
    else if (to.path === '/packs') title = "Packs | " + listPrefix;

    document.title = title;
    next();
});

const app = Vue.createApp({
    data: () => ({ store }),
    methods: {
        switchList(type) {
            this.store.setListType(type);
        }
    }
});

app.use(router);
app.mount('#app');