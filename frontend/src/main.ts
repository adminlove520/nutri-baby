import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import './assets/styles/theme.scss'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import 'element-plus/theme-chalk/dark/css-vars.css'
// 函数调用型组件（ElMessage / ElMessageBox / ElNotification）样式不会被按需插件自动注入，需手动引入
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import 'element-plus/theme-chalk/el-notification.css'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const themeStore = useThemeStore()
themeStore.initTheme()

app.use(router)
app.use(i18n)

app.mount('#app')
