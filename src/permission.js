import router from './router'
import store from './store'
import { Message } from 'element-ui'
import NProgress from 'nprogress' // 进度条插件
import 'nprogress/nprogress.css' // 进度条插件样式
import { getToken } from '@/utils/auth' // 获取token
import getPageTitle from '@/utils/get-page-title' // 获取页面的标题

NProgress.configure({ showSpinner: false }) // 进度条插件配置

const whiteList = ['/login'] // 免登陆白名单

router.beforeEach(async (to, from, next) => {
  // 进度条开始
  NProgress.start()

  // 设置页面标题
  document.title = getPageTitle(to.meta.title)

  next()
  return
  // 判断用户是否通过
  const hasToken = getToken()

  // a) 如果已有token
  if (hasToken) {
    if (to.path === '/login') {
      next({ path: '/' })
      NProgress.done()
    } else {
      const hasGetUserInfo = store.getters.name
      if (hasGetUserInfo) {
        next()
      } else {
        try {
          // 获取用户userinfo
          await store.dispatch('user/getInfo')
          next()
        } catch (error) {
          // 删除历史token，重新跳转登录页，重新登录
          await store.dispatch('user/resetToken')
          Message.error(error || 'Has Error')
          next(`/login?redirect=${to.path}`)
          NProgress.done()
        }
      }
    }
  } else {
    // b)如果没有token
    if (whiteList.indexOf(to.path) !== -1) {
      // 如果在免登白名单中，直接跳转
      next()
    } else {
      // 如果没有在免登白名单中，需跳转到登陆页面
      next(`/login?redirect=${to.path}`)
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  // finish progress bar
  NProgress.done()
})
