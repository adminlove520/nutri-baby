import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import './assets/styles/theme.scss'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const themeStore = useThemeStore()
themeStore.initTheme()

app.use(router)
app.use(i18n)

app.mount('#app')
