<template>
  <div class="common-layout">
    <el-container class="main-container">
      
      <!-- Desktop Sidebar -->
      <el-aside width="240px" class="hidden-xs-only app-sidebar">
        <div class="sidebar-logo">
           <img src="@/assets/vue.svg" alt="Logo" class="logo-img"/>
           <span>Nutri-Baby</span>
        </div>
        <el-menu
          :default-active="activeRoute"
          class="sidebar-menu"
          router
        >
          <el-menu-item index="/">
            <el-icon><House /></el-icon>
            <span>首页概览</span>
          </el-menu-item>
          <el-menu-item index="/timeline">
            <el-icon><Timer /></el-icon>
            <span>时光轴</span>
          </el-menu-item>
          <el-menu-item index="/statistics">
            <el-icon><PieChart /></el-icon>
            <span>数据统计</span>
          </el-menu-item>
           <el-menu-item index="/baby/list">
            <el-icon><User /></el-icon>
            <span>宝宝管理</span>
          </el-menu-item>
          <el-menu-item index="/user">
            <el-icon><Setting /></el-icon>
            <span>个人中心</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <!-- Header -->
        <el-header class="app-header">
           <div class="header-left hidden-sm-and-up">
              <span class="mobile-logo">Nutri-Baby</span>
           </div>
           <div class="header-right">
              <el-dropdown>
                <span class="el-dropdown-link user-profile">
                   <el-avatar :size="32" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" />
                   <span class="username hidden-xs-only">User</span>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item>个人设置</el-dropdown-item>
                    <el-dropdown-item divided>退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
           </div>
        </el-header>

        <!-- Main Content -->
        <el-main class="app-main">
           <div class="content-wrapper">
             <router-view v-slot="{ Component }">
               <transition name="fade" mode="out-in">
                 <component :is="Component" />
               </transition>
             </router-view>
           </div>
        </el-main>

        <!-- Mobile Bottom Nav -->
        <el-footer class="app-footer hidden-sm-and-up">
          <el-menu
            :default-active="activeRoute"
            mode="horizontal"
            :ellipsis="false"
            router
            class="mobile-nav"
          >
            <el-menu-item index="/">
              <el-icon><House /></el-icon>
              <span>首页</span>
            </el-menu-item>
             <el-menu-item index="/timeline">
              <el-icon><Timer /></el-icon>
              <span>记录</span>
            </el-menu-item>
            <el-menu-item index="/statistics">
              <el-icon><PieChart /></el-icon>
              <span>统计</span>
            </el-menu-item>
            <el-menu-item index="/user">
              <el-icon><User /></el-icon>
              <span>我的</span>
            </el-menu-item>
          </el-menu>
        </el-footer>

      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { House, Timer, PieChart, User, Setting } from '@element-plus/icons-vue'
import 'element-plus/theme-chalk/display.css' // Important for hidden classes
import { useBabyStore } from '@/stores/baby'

const route = useRoute()
const babyStore = useBabyStore()
const activeRoute = computed(() => route.path)

onMounted(() => {
    babyStore.fetchBabies()
})
</script>

<style scoped lang="scss">
.common-layout {
  height: 100vh;
  display: flex;
  background-color: var(--app-bg-color);
}

.main-container {
  height: 100%;
  width: 100%;
}

/* Sidebar (Desktop) */
.app-sidebar {
  background-color: #fff;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.02);

  .sidebar-logo {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #f9f9f9;
    font-size: 20px;
    font-weight: 800;
    color: var(--el-color-primary);
    
    .logo-img {
       width: 32px;
       height: 32px;
       margin-right: 12px;
    }
  }

  .sidebar-menu {
    border-right: none;
    flex: 1;
    padding: 10px;

    .el-menu-item {
      height: 50px;
      line-height: 50px;
      margin-bottom: 4px;
      border-radius: 12px;

      &:hover, &.is-active {
        background-color: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }
    }
  }
}

/* Header */
.app-header {
  height: 64px;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 10;
  
  .mobile-logo {
     font-weight: 800;
     font-size: 20px;
     color: var(--el-color-primary);
  }
  
  .header-right {
     margin-left: auto;
  }
  
  .user-profile {
     display: flex;
     align-items: center;
     cursor: pointer;
     padding: 4px 8px;
     border-radius: 20px;
     transition: background 0.2s;

     &:hover {
       background: #f5f7fa;
     }
     
     .username {
        margin-left: 10px;
        font-size: 14px;
        font-weight: 500;
        color: #606266;
     }
  }
}

/* Main Content */
.app-main {
  padding: 0;
  overflow-y: auto;
  
  .content-wrapper {
     padding: 24px;
     max-width: 1200px; /* PC Content Limit */
     margin: 0 auto;
     
     /* Mobile Adjustments */
     @media (max-width: 768px) {
        padding: 16px;
        padding-bottom: 100px; /* Space for footer */
     }
  }
}

/* Mobile Bottom Nav */
.app-footer {
  position: fixed;
  bottom: 0;
  width: 100%;
  height: auto;
  padding: 0;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--el-color-primary-light-8);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.04);
}

.mobile-nav {
  display: flex;
  justify-content: space-around;
  width: 100%;
  border-top: none;
  background: transparent;
  
  .el-menu-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 64px;
    line-height: 1;
    padding: 0;
    border-bottom: none !important;
    
    &.is-active {
       background-color: transparent !important;
       color: var(--el-color-primary) !important;
       font-weight: bold;
    }
    
    .el-icon {
      margin-bottom: 6px;
      font-size: 22px;
    }
    
    span {
      font-size: 11px;
    }
  }
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
