import * as axios from 'axios'
import qs from 'qs'
import { jdMemberCrypto } from '@/utils/encrypt'

let host = !process.server ? location.origin : ''
let path = ''

// 1)实例化一个axios对象 http（根据当前环境配置baseURL）
const http = axios.create({
  baseURL: host + path,
  timeout: 10000
})

// 2）设置默认请求头的content-type
http.defaults.headers['Content-Type'] = 'application/json'

// 3）请求拦截
http.interceptors.request.use(
  (config) => {
    console.log('请求拦截----', config)
    if (config.loading !== false) {
      // $vue.__proto__.$loading.show();
      $vue.__proto__.loading = true
    }
    if (config.isCiphertext) {
      console.log('请求入参【未加密】', config.data)
      config.data = jdMemberCrypto.encryptReq(config.data)
    }
    return config
  },
  (error) => {
    console.error('request', qs.parse(error))
    // $vue.__proto__.$loading.hide();
    $vue.__proto__.loading = false
    return Promise.reject(error)
  }
)

//4）响应拦截
http.interceptors.response.use(
  (response) => {
    console.log('响应拦截----', response)
    if (response.config.loading !== false) {
      // $vue.__proto__.$loading.hide();
      $vue.__proto__.loading = false
    }
    if (response.config.isCiphertext) {
      let biz_content = jdMemberCrypto.decryptRes(response.data)
      console.log('响应出参【未加密】', biz_content)
      response.data.biz_content = biz_content
    }
    return response
  },
  (error) => {
    // $vue.__proto__.$loading.hide();
    $vue.__proto__.loading = false
    let errMsg = {}
    if (qs.parse(error).response) {
      switch (qs.parse(error).response.status) {
        case 400:
          errMsg.message = '请求错误(400)'
          break
        case 401:
          errMsg.message = '未授权，请重新登录(401)'
          break
        case 403:
          errMsg.message = '拒绝访问(403)'
          break
        case 404:
          errMsg.message = '请求出错(404)'
          break
        case 408:
          errMsg.message = '请求超时(408)'
          break
        case 500:
          errMsg.message = '服务器错误(500)'
          break
        case 501:
          errMsg.message = '服务未实现(501)'
          break
        case 502:
          errMsg.message = '网络错误(502)'
          break
        case 503:
          errMsg.message = '服务不可用(503)'
          break
        case 504:
          errMsg.message = '网络超时(504)'
          break
        case 505:
          errMsg.message = 'HTTP版本不受支持(505)'
          break
        default:
          errMsg.message = `连接出错(${qs.parse(error).response.status})!`
      }
      errMsg.status = qs.parse(error).response.status
      errMsg.url = qs.parse(error).response.config.url
    }
    console.error('response', errMsg)
    return errMsg
  }
)

export default http
