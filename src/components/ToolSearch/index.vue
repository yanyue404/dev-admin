<template>
  <transition name="search-fade">
    <div v-if="visible" class="search-modal" @click.self="close">
      <div class="search-container">
        <!-- 搜索输入框 -->
        <div class="search-header">
          <el-input
            ref="searchInput"
            v-model="keyword"
            placeholder="搜索工具... 输入关键词快速定位"
            prefix-icon="el-icon-search"
            size="large"
            clearable
            @input="handleSearch"
          ></el-input>
          <span class="shortcut-hint">ESC 关闭 · ↑↓ 选择 · Enter 进入</span>
        </div>

        <!-- 搜索结果 -->
        <div class="search-body">
          <!-- 最近使用 -->
          <div v-if="!keyword && recentTools.length" class="section">
            <div class="section-title">
              <i class="el-icon-time"></i> 最近使用
              <span class="clear-btn" @click="clearRecent">清空</span>
            </div>
            <div
              v-for="(tool, idx) in recentTools"
              :key="'recent-' + tool.path"
              class="search-item"
              :class="{ active: activeIndex === idx }"
              @click="goTo(tool)"
              @mouseenter="activeIndex = idx"
            >
              <i :class="tool.icon || 'el-icon-document'" class="item-icon"></i>
              <span class="item-title">{{ tool.title }}</span>
              <span class="item-path">{{ tool.path }}</span>
              <span v-if="!isFavorite(tool.path)" class="fav-btn" @click.stop="addFavorite(tool)">
                <i class="el-icon-star-off"></i>
              </span>
              <span v-else class="fav-btn fav-active" @click.stop="removeFavorite(tool.path)">
                <i class="el-icon-star-on"></i>
              </span>
            </div>
          </div>

          <!-- 我的收藏 -->
          <div v-if="!keyword && favoriteTools.length" class="section">
            <div class="section-title">
              <i class="el-icon-star-on"></i> 我的收藏
            </div>
            <div
              v-for="(tool, idx) in favoriteTools"
              :key="'fav-' + tool.path"
              class="search-item"
              :class="{ active: activeIndex === (recentTools.length || 0) + idx }"
              @click="goTo(tool)"
              @mouseenter="activeIndex = (recentTools.length || 0) + idx"
            >
              <i :class="tool.icon || 'el-icon-document'" class="item-icon"></i>
              <span class="item-title">{{ tool.title }}</span>
              <span class="item-path">{{ tool.path }}</span>
              <span class="fav-btn fav-active" @click.stop="removeFavorite(tool.path)">
                <i class="el-icon-star-on"></i>
              </span>
            </div>
          </div>

          <!-- 全部工具 -->
          <div v-if="!keyword" class="section">
            <div class="section-title">
              <i class="el-icon-s-grid"></i> 全部工具
            </div>
            <div
              v-for="(tool, idx) in allTools"
              :key="'all-' + tool.path"
              class="search-item"
              :class="{ active: activeIndex === favOffset + idx }"
              @click="goTo(tool)"
              @mouseenter="activeIndex = favOffset + idx"
            >
              <i :class="tool.icon || 'el-icon-document'" class="item-icon"></i>
              <span class="item-title">{{ tool.title }}</span>
              <span class="item-path">{{ tool.path }}</span>
              <span v-if="!isFavorite(tool.path)" class="fav-btn" @click.stop="addFavorite(tool)">
                <i class="el-icon-star-off"></i>
              </span>
              <span v-else class="fav-btn fav-active" @click.stop="removeFavorite(tool.path)">
                <i class="el-icon-star-on"></i>
              </span>
            </div>
          </div>

          <!-- 搜索过滤结果 -->
          <div v-if="keyword" class="section">
            <div class="section-title">
              <i class="el-icon-search"></i> 搜索结果（{{ filteredTools.length }}）
            </div>
            <div v-if="filteredTools.length === 0" class="no-result">
              <i class="el-icon-warning-outline"></i> 未找到匹配的工具
            </div>
            <div
              v-for="(tool, idx) in filteredTools"
              :key="'filter-' + tool.path"
              class="search-item"
              :class="{ active: activeIndex === idx }"
              @click="goTo(tool)"
              @mouseenter="activeIndex = idx"
            >
              <i :class="tool.icon || 'el-icon-document'" class="item-icon"></i>
              <span class="item-title" v-html="highlightTitle(tool.title)"></span>
              <span class="item-path">{{ tool.path }}</span>
              <span v-if="!isFavorite(tool.path)" class="fav-btn" @click.stop="addFavorite(tool)">
                <i class="el-icon-star-off"></i>
              </span>
              <span v-else class="fav-btn fav-active" @click.stop="removeFavorite(tool.path)">
                <i class="el-icon-star-on"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
const FAVORITE_KEY = 'sfunc_favorite_tools'
const RECENT_KEY = 'sfunc_recent_tools'

export default {
  name: 'ToolSearch',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      keyword: '',
      activeIndex: 0,
      favorites: this.loadFavorites(),
      recentList: this.loadRecent()
    }
  },
  computed: {
    allTools() {
      const routes = this.$router.options.routes
      const tools = []
      this.extractTools(routes, tools)
      return tools
    },
    recentTools() {
      return this.recentList.map(path => this.findTool(path)).filter(Boolean)
    },
    favoriteTools() {
      return this.favorites.map(path => this.findTool(path)).filter(Boolean)
    },
    favOffset() {
      return (this.recentTools.length || 0) + (this.favoriteTools.length || 0)
    },
    filteredTools() {
      if (!this.keyword) return []
      const kw = this.keyword.toLowerCase()
      return this.allTools.filter(tool =>
        tool.title.toLowerCase().includes(kw) ||
        tool.path.toLowerCase().includes(kw) ||
        (tool.group && tool.group.toLowerCase().includes(kw))
      )
    }
  },
  watch: {
    visible(v) {
      if (v) {
        this.keyword = ''
        this.activeIndex = 0
        this.$nextTick(() => {
          if (this.$refs.searchInput) this.$refs.searchInput.focus()
        })
      }
    },
    keyword() {
      this.activeIndex = 0
    }
  },
  mounted() {
    document.addEventListener('keydown', this.handleKeydown)
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeydown)
  },
  methods: {
    extractTools(routes, tools, group) {
      routes.forEach(route => {
        if (route.hidden) return
        if (route.children && route.children.length > 0) {
          const subGroup = route.meta ? route.meta.title : group
          route.children.forEach(child => {
            if (child.hidden) return
            if (child.meta) {
              const fullPath = this.resolveRoutePath(route.path, child.path)
              tools.push({
                title: child.meta.title,
                icon: child.meta.icon,
                path: fullPath,
                group: subGroup || ''
              })
            }
          })
        } else if (route.meta) {
          tools.push({
            title: route.meta.title,
            icon: route.meta.icon,
            path: route.path,
            group: group || ''
          })
        }
      })
    },
    resolveRoutePath(parentPath, childPath) {
      if (childPath.startsWith('/')) return childPath
      const base = parentPath.startsWith('/') ? parentPath : '/' + parentPath
      const resolved = (base + '/' + childPath).replace(/\/+/g, '/')
      return resolved
    },
    findTool(path) {
      return this.allTools.find(t => t.path === path)
    },
    handleSearch() {
    },
    highlightTitle(title) {
      if (!this.keyword) return this.escHtml(title)
      const kw = this.keyword.toLowerCase()
      const idx = title.toLowerCase().indexOf(kw)
      if (idx === -1) return this.escHtml(title)
      const before = this.escHtml(title.substring(0, idx))
      const match = this.escHtml(title.substring(idx, idx + this.keyword.length))
      const after = this.escHtml(title.substring(idx + this.keyword.length))
      return before + '<span class="hl-match">' + match + '</span>' + after
    },
    escHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },
    handleKeydown(e) {
      if (!this.visible) return
      if (e.key === 'Escape') {
        this.close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const list = this.keyword ? this.filteredTools : this.allTools
        this.activeIndex = (this.activeIndex + 1) % Math.max(list.length, 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const list = this.keyword ? this.filteredTools : this.allTools
        this.activeIndex = (this.activeIndex - 1 + list.length) % Math.max(list.length, 1)
      } else if (e.key === 'Enter') {
        const list = this.keyword ? this.filteredTools : this.allTools
        if (this.activeIndex < list.length) {
          this.goTo(list[this.activeIndex])
        }
      }
    },
    goTo(tool) {
      this.addRecent(tool.path)
      this.$router.push(tool.path)
      this.close()
    },
    close() {
      this.$emit('close')
    },

    isFavorite(path) {
      return this.favorites.includes(path)
    },
    addFavorite(tool) {
      if (!this.favorites.includes(tool.path)) {
        this.favorites.push(tool.path)
        this.saveFavorites()
      }
    },
    removeFavorite(path) {
      this.favorites = this.favorites.filter(p => p !== path)
      this.saveFavorites()
    },
    loadFavorites() {
      try {
        return JSON.parse(localStorage.getItem(FAVORITE_KEY)) || []
      } catch (e) { return [] }
    },
    saveFavorites() {
      localStorage.setItem(FAVORITE_KEY, JSON.stringify(this.favorites))
    },

    addRecent(path) {
      this.recentList = [path, ...this.recentList.filter(p => p !== path)].slice(0, 8)
      this.saveRecent()
    },
    clearRecent() {
      this.recentList = []
      this.saveRecent()
    },
    loadRecent() {
      try {
        return JSON.parse(localStorage.getItem(RECENT_KEY)) || []
      } catch (e) { return [] }
    },
    saveRecent() {
      localStorage.setItem(RECENT_KEY, JSON.stringify(this.recentList))
    }
  }
}
</script>

<style lang="scss" scoped>
.search-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
}

.search-container {
  width: 560px;
  max-height: 520px;
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-header {
  padding: 16px 16px 8px;
  position: relative;

  ::v-deep .el-input__inner {
    height: 44px;
    font-size: 16px;
    border-radius: 8px;
  }

  .shortcut-hint {
    position: absolute;
    right: 28px;
    top: 24px;
    color: var(--text-placeholder);
    font-size: 12px;
  }
}

.search-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.section {
  margin-bottom: 12px;

  .section-title {
    font-size: 12px;
    color: var(--text-secondary);
    padding: 4px 0;
    display: flex;
    align-items: center;
    gap: 4px;

    i { margin-right: 4px; }

    .clear-btn {
      cursor: pointer;
      margin-left: auto;
      &:hover { color: #409eff; }
    }
  }
}

.search-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover, &.active {
    background: var(--bg-tertiary);
  }

  .item-icon {
    width: 20px;
    color: var(--text-regular);
    font-size: 16px;
  }

  .item-title {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
    margin-right: 8px;
  }

  .item-path {
    font-size: 12px;
    color: var(--text-placeholder);
    margin-left: auto;
    font-family: monospace;
  }

  .fav-btn {
    margin-left: 8px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-placeholder);
    transition: color 0.2s;

    &:hover { color: #e6a23c; }

    &.fav-active { color: #e6a23c; }
  }
}

.no-result {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  i { font-size: 32px; margin-bottom: 8px; display: block; }
}

.search-fade-enter-active { transition: opacity 0.15s; }
.search-fade-leave-active { transition: opacity 0.1s; }
.search-fade-enter, .search-fade-leave-to { opacity: 0; }
</style>

<style lang="scss">
/* 全局：搜索关键词高亮 */
.hl-match {
  color: #409eff;
  font-weight: 600;
}
</style>
