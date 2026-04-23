<template>
  <div class="about-page">
    <div class="header">
      <el-button link :icon="ArrowLeft" @click="router.back()" class="back-btn"></el-button>
      <h2 class="title">关于 Nutri-Baby</h2>
    </div>

    <div class="content">
      <div class="logo-section">
        <img src="@/assets/vue.svg" alt="Logo" class="logo" />
        <h1 class="app-name">Nutri-Baby</h1>
        <p class="version">Version 1.2.0 (Stable)</p>
      </div>

      <el-card class="info-card">
        <h3>项目简介</h3>
        <p>Nutri-Baby 是一款专为新手父母打造的科学育儿助手。我们通过记录宝宝的饮食、睡眠、排泄和成长数据，结合 AI 深度分析，为您提供个性化的育儿建议和预警提醒。</p>
      </el-card>

      <el-card class="info-card">
        <h3>核心功能</h3>
        <ul class="feature-list">
          <li>
            <el-icon><Check /></el-icon>
            <span><b>全方位记录</b>：涵盖奶量、辅食、睡眠、换尿布等日常琐事。</span>
          </li>
          <li>
            <el-icon><Check /></el-icon>
            <span><b>成长曲线</b>：自动生成 WHO 标准身高体重曲线。</span>
          </li>
          <li>
            <el-icon><Check /></el-icon>
            <span><b>成长相册</b>：记录宝宝每个珍贵瞬间。</span>
          </li>
          <li>
            <el-icon><Check /></el-icon>
            <span><b>疫苗提醒</b>：根据宝宝月龄自动规划并推送接种提醒。</span>
          </li>
          <li>
            <el-icon><Check /></el-icon>
            <span><b>AI 育儿专家</b>：基于 OpenAI/MiniMax 大模型提供实时咨询。</span>
          </li>
          <li>
            <el-icon><Check /></el-icon>
            <span><b>家庭共享</b>：支持家庭成员共同维护，实时同步。</span>
          </li>
        </ul>
      </el-card>

      <el-card class="info-card">
        <h3>开发团队</h3>
        <p>由一群热爱技术的爸爸妈妈共同开发。如果您有任何建议或反馈，欢迎通过系统设置中的“意见反馈”与我们联系。</p>
      </el-card>

      <div class="footer">
        <p>© 2026 Nutri-Baby Project. All rights reserved.</p>
        <p>用爱守护每一位宝宝的成长</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, Check } from '@element-plus/icons-vue'

const router = useRouter()
</script>

<style scoped lang="scss">
.about-page {
  min-height: 100vh;
  background-color: var(--app-bg-color);
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  .back-btn { font-size: 20px; margin-right: 10px; color: var(--el-text-color-primary); }
  .title { margin: 0; font-size: 20px; font-weight: 800; }
}

.content {
  max-width: 600px;
  margin: 0 auto;
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
  .logo { width: 80px; height: 80px; margin-bottom: 16px; }
  .app-name { font-size: 28px; font-weight: 900; color: var(--el-color-primary); margin: 0; }
  .version { font-size: 14px; color: var(--el-text-color-secondary); margin-top: 4px; }
}

.info-card {
  margin-bottom: 20px;
  h3 { margin-top: 0; color: var(--el-color-primary); font-size: 18px; margin-bottom: 12px; }
  p { line-height: 1.6; color: var(--el-text-color-regular); margin: 0; }
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
    color: var(--el-text-color-regular);
    font-size: 14px;
    .el-icon { color: var(--el-color-success); margin-top: 3px; }
    b { color: var(--el-text-color-primary); }
  }
}

.footer {
  text-align: center;
  margin-top: 40px;
  padding-bottom: 20px;
  p { font-size: 12px; color: var(--el-text-color-secondary); margin: 4px 0; }
}
</style>
