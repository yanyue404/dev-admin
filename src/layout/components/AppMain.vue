<template>
  <section class="app-main">
    <transition name="fade-transform" mode="out-in">
      <!-- <router-view :key="key" />-->
      <!-- <keep-alive :include="cachedViews"> -->
      <keep-alive>
        <router-view></router-view>
      </keep-alive>
    </transition>
  </section>
</template>

<script>
export default {
  name: 'AppMain',
  computed: {
    cachedViews() {
      return this.$store.state.tagsView.cachedViews
    } /*,
    key() {
      return this.$route.path
    }*/
  }
}
</script>

<style lang="scss" scoped>
.app-main {
  /* 96 = navbar 56 + tags 40 */
  min-height: calc(100vh - 96px);
  width: 100%;
  position: relative;
  overflow: hidden;
  background: var(--bg-page);
}
.fixed-header + .app-main {
  padding-top: 96px;
}

.hasTagsView {
  .app-main {
    min-height: calc(100vh - 96px);
  }

  .fixed-header + .app-main {
    padding-top: 96px;
  }
}
</style>
