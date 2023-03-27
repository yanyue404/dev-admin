<template>
  <div class="p-commodity">
    <h3>复制过来的富文本:</h3>
    <textarea v-model="text"></textarea>
    <h3>处理后的：</h3>
    <textarea v-model="removeXssText"></textarea>
  </div>
</template>

<script>
import { FilterCSS } from 'cssfilter'
import xss from 'xss'

let xssFilter
getXssFilter()
function getXssFilter() {
  const cssFilter = new FilterCSS({
    whiteList: {
      color: true,
      'font-weight': true,
      'background-color': true
    }
  })
  xssFilter =
    xssFilter ||
    new xss.FilterXSS({
      onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
        // 保留data-属性
        if (name.substr(0, 5) === 'data-') {
          return `${name}="${xss.escapeAttrValue(value)}"`
        }
        // 样式过滤
        if (name === 'style') {
          return `${name}="${xss.escapeAttrValue(cssFilter.process(value))}"`
        }
      },
      // 忽略掉script
      stripIgnoreTagBody: ['script']
    })
}
export default {
  data() {
    return {
      text: ''
    }
  },
  computed: {
    removeXssText: {
      get() {
        try {
          return xssFilter.process(this.text).replace(/\s+style=\"\"/g, "");
        } catch (err) {
          console.log(err)
        }
        return '解析失败'
      },
      set(val) {
        console.log('data:', val)
      }
    }
  },
  methods: {}
}
</script>

<style lang="scss">
.p-commodity {
  font-size: 14px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 61px);
  padding: 12px;
  textarea {
    flex: 1;
    color: inherit;
    font: inherit;
    -webkit-tap-highlight-color: transparent;
    outline: 0;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-size: 100%;
    font-weight: 500;
  }
}
</style>
