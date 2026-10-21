<template>
  <div class="navbar">
    <hamburger :is-active="sidebar.opened" class="hamburger-container" @toggleClick="toggleSideBar" />

    <div class="path">
      <template v-if="currentTool">
        <span>{{ currentTool.groupName }}</span>
        <i class="el-icon-arrow-right"></i>
        <strong>{{ currentTool.title }}</strong>
      </template>
      <strong v-else>{{ pageTitle }}</strong>
    </div>

    <div class="right-menu">
      <div class="search-trigger" @click="showSearch = true">
        <i class="el-icon-search"></i>
        <span class="search-text">搜索工具</span>
        <span class="search-shortcut">Ctrl+K</span>
      </div>
      <div class="theme-toggle" @click="toggleTheme" :title="theme === 'light' ? '切换暗色' : '切换亮色'">
        <i :class="theme === 'light' ? 'el-icon-moon' : 'el-icon-sunny'"></i>
      </div>
    </div>

    <!-- 搜索弹窗 -->
    <tool-search :visible="showSearch" @close="showSearch = false" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Hamburger from '@/components/Hamburger'
import ToolSearch from '@/components/ToolSearch'
import { findShellTool } from '@/layout/shell-nav'

export default {
  components: {
    Hamburger,
    ToolSearch
  },
  data() {
    return {
      showSearch: false
    }
  },
  computed: {
    ...mapGetters([
      'sidebar',
      'theme'
    ]),
    currentTool() {
      return findShellTool(this.$router.options.routes, this.$route.path)
    },
    pageTitle() {
      return (this.$route.meta && this.$route.meta.title) || 'Dev Admin'
    }
  },
  mounted() {
    // 初始化主题
    this.applyTheme()
    document.addEventListener('keydown', this.globalKeydown)
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.globalKeydown)
  },
  methods: {
    toggleSideBar() {
      this.$store.dispatch('app/toggleSideBar')
    },
    toggleTheme() {
      this.$store.dispatch('app/toggleTheme')
      this.applyTheme()
    },
    applyTheme() {
      const theme = this.$store.state.app.theme
      document.documentElement.setAttribute('data-theme', theme)
    },
    globalKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        this.showSearch = !this.showSearch
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  height: 56px;
  display: flex;
  align-items: center;
  padding-right: 16px;
  background: var(--navbar-bg);
  border-bottom: 1px solid var(--border-light);
  transition: background 0.3s, border-color 0.3s;

  .hamburger-container {
    display: flex;
    align-items: center;
    height: 100%;
    cursor: pointer;
    flex: 0 0 auto;

    &:hover {
      background: var(--bg-tertiary);
    }
  }

  .path {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    color: var(--text-secondary);
    font-size: 13px;

    i {
      font-size: 12px;
      color: var(--text-placeholder);
    }

    strong {
      color: var(--text-primary);
      font-weight: 600;
    }
  }

  .right-menu {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;

    .theme-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 18px;
      color: var(--text-secondary);

      &:hover {
        background: var(--bg-tertiary);
        color: #409eff;
      }

      .el-icon-moon { transition: transform 0.3s; }
      .el-icon-sunny { transition: transform 0.3s; color: #e6a23c; }
      &:hover .el-icon-moon { transform: rotate(-15deg); }
      &:hover .el-icon-sunny { transform: rotate(15deg); }
    }

    .search-trigger {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 220px;
      height: 34px;
      padding: 0 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: rgba(64, 158, 255, 0.1);
        border-color: #409eff;
      }

      .el-icon-search {
        font-size: 14px;
        color: var(--text-secondary);
      }

      .search-text {
        font-size: 13px;
        color: var(--text-regular);
      }

      .search-shortcut {
        font-size: 11px;
        color: var(--text-placeholder);
        background: var(--bg-tertiary);
        padding: 1px 6px;
        border-radius: 3px;
        font-family: monospace;
      }
    }
  }
}
</style>
