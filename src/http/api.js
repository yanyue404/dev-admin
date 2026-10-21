import http from './http.js'
import { Message } from 'element-ui'

/*
【注意事项】
    1）当请求头 content-type 为application/x-www-form-urlencoded 时，需要用 qs.stringify 处理一下params参数 
*/

// 获取授权接口
export const getWechatOauthUrl = (
  reqUrl,
  params,
  config = { isCiphertext: true }
) => {
  config = Object.assign(config, { isCiphertext: true })
  return http.post(reqUrl, params, config)
}

// 获取cms中的产品信息
export const getCmsProductApi = (reqUrl, params) => {
  return http
    .post(reqUrl, params, {
      loading: false
    })
    .then((res) => {
      let result = res.data
      if (result.code == '0000') {
        return result.data
      } else {
        try {
          let errorMsg = result.errorMsg
          Message.error({
            message: errorMsg
          })
          throw new Error(`selectByProductId请求报错-${errorMsg}`)
        } catch (err) {
          Message.error({
            message: err
          })
          throw err
        }
      }
    })
}
