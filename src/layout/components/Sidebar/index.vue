<template>
  <div class="shell-side" :class="{ collapse: isCollapse }">
    <div class="brand">
      <span class="mark">D</span>
      <div v-show="!isCollapse" class="brand-text">
        <strong>Dev Admin</strong>
        <em>本地工具</em>
      </div>
    </div>
    <nav class="nav">
      <section v-for="group in groups" :key="group.id">
        <h2 v-show="!isCollapse">{{ group.name }}</h2>
        <router-link
          v-for="tool in group.tools"
          :key="tool.path"
          :to="tool.path"
          class="item"
          :title="tool.title"
        >
          <i :class="tool.icon"></i>
          <span v-show="!isCollapse">{{ tool.title }}</span>
        </router-link>
      </section>
    </nav>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { collectShellTools } from '@/layout/shell-nav'

export default {
  computed: {
    ...mapGetters(['sidebar']),
    isCollapse() {
      return !this.sidebar.opened
    },
    groups() {
      return collectShellTools(this.$router.options.routes)
    }
  }
}
</script>

<style lang="scss" scoped>
.shell-side {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--sidebar-ink);
  background: var(--sidebar-bg);
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
  font-synthesis: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-light);
  flex: 0 0 auto;
}

.mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--shell-mark);
  color: #fff;
  font-family: "Segoe UI", sans-serif;
  font-size: 15px;
  font-weight: 700;
  line-height: 28px;
  text-align: center;
  letter-spacing: 0;
  flex: 0 0 28px;
}

.brand-text {
  min-width: 0;

  strong,
  em {
    display: block;
  }

  strong {
    color: var(--sidebar-ink);
    font-size: 13px;
    font-weight: 700;
    line-height: 16px;
    letter-spacing: 0;
  }

  em {
    margin-top: 2px;
    color: var(--sidebar-faint);
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    line-height: 16px;
    letter-spacing: 0;
  }
}

.nav {
  flex: 1;
  overflow: auto;
  padding: 6px 10px 20px;
}

h2 {
  margin: 14px 8px 6px;
  padding: 0;
  color: var(--sidebar-faint);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  letter-spacing: 0.04em;
}

.nav section:first-child h2 {
  margin-top: 8px;
}
</style>

<style lang="scss">
#app .sidebar-container.shell-side a.item {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  height: 34px;
  margin: 0;
  padding: 0 8px;
  overflow: hidden;
  border-radius: 8px;
  color: var(--sidebar-ink);
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: 0;
  text-decoration: none;
  white-space: nowrap;
}

#app .sidebar-container.shell-side a.item > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

#app .sidebar-container.shell-side a.item > i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1;
}

#app .sidebar-container.shell-side a.item > i::before {
  display: block;
  width: 16px;
  line-height: 16px;
  text-align: center;
}

#app .sidebar-container.shell-side a.item:hover {
  background: var(--sidebar-item-hover);
  color: var(--sidebar-ink);
}

#app .sidebar-container.shell-side a.item.router-link-exact-active,
#app .sidebar-container.shell-side a.item.router-link-exact-active:hover {
  background: var(--shell-accent-soft);
  color: var(--shell-accent);
  font-weight: 600;
}

#app .sidebar-container.shell-side a.item.router-link-exact-active > i,
#app .sidebar-container.shell-side a.item.router-link-exact-active:hover > i {
  color: var(--shell-accent);
}

#app .sidebar-container.shell-side.collapse .brand {
  justify-content: center;
  padding: 0;
}

#app .sidebar-container.shell-side.collapse .nav {
  padding: 8px 8px 16px;
}

#app .sidebar-container.shell-side.collapse a.item {
  justify-content: center;
  padding: 0;
}
</style>
