<template>
  <div class="pic-compress">
    <iframe :src="src" title="图片压缩" />
  </div>
</template>

<script>
export default {
  name: 'PicCompress',
  computed: {
    src() {
      const base = process.env.BASE_URL || '/'
      return base.replace(/\/?$/, '/') + 'picCompress/'
    }
  }
}
</script>

<style lang="scss" scoped>
.pic-compress {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}
</style>
