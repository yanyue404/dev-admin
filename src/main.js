import Vue from 'vue'

import 'normalize.css/normalize.css' // 浏览器默认的样式重置

import ElementUI from 'element-ui' // 整包加载element-ui
import 'element-ui/lib/theme-chalk/index.css'
import locale from 'element-ui/lib/locale/lang/zh-CN' // 国际化语言

import '@/styles/index.scss' // 全局样式

import App from './App'
import store from './store'
import router from './router.js'

import '@/icons' // icon图标集成（svg）
import '@/permission' // 权限控制
import cmsBridge from '@/cmsBridge' //cms项目桥接

import vueHljs from 'vue-hljs'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

import { VueJsonp } from 'vue-jsonp'

/**
 * If you don't want to use mock-server
 * you want to use MockJs for mock api
 * you can execute: mockXHR()
 *
 * Currently MockJs will be used in the production environment,
 * please remove it before going online ! ! !
 */
if (process.env.NODE_ENV === 'production') {
  const { mockXHR } = require('../mock')
  mockXHR()
}

// set ElementUI lang to EN
// 如果想要中文版 element-ui，按如下方式声明
// Vue.use(ElementUI)
Vue.use(ElementUI, { locale })
Vue.prototype.$cms = cmsBridge
Vue.use(vueHljs, { hljs })
Vue.use(VueJsonp)

Vue.config.productionTip = false
window.$vue = new Vue({
  el: '#app',
  router,
  store,
  render: (h) => h(App)
})
