import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import './assets/styles/theme.scss'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import 'element-plus/theme-chalk/dark/css-vars.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
