import MD5 from 'crypto-js/md5'
import encUtf8 from 'crypto-js/enc-utf8'
import AES from 'crypto-js/aes'
import ECB from 'crypto-js/mode-ecb'
import Pkcs7 from 'crypto-js/pad-pkcs7'
import encBase64 from 'crypto-js/enc-base64'
import encHex from 'crypto-js/enc-hex'

// 新版加密工具类
export const enc = (function () {
  // aes配置默认使用ecb和pkcs7
  const aesOptions = {
    mode: ECB,
    padding: Pkcs7
  }

  return {
    AES: {
      /**
       * AES加密
       * @param {string} plaintText 明文
       * @param {string} key 秘钥
       * @param {boolean} hex 是否返回十六进制，默认false
       * @returns
       */
      encrypt: function (plaintText, key, hex = false) {
        let message = plaintText
        if (typeof message == 'object') {
          message = JSON.stringify(message)
        }
        let wordArray = AES.encrypt(
          encUtf8.parse(message),
          encUtf8.parse(key),
          aesOptions
        ).ciphertext
        return wordArray.toString(hex ? encHex : encBase64)
      },
      /**
       * AES解密
       * @param {string} cipherText 密文
       * @param {string} key 秘钥
       */
      decrypt: function (cipherText, key) {
        return encUtf8.stringify(
          AES.decrypt(cipherText, encUtf8.parse(key), aesOptions)
        )
      }
    },
    /**
     * MD5编码
     * @param {string} text 明文
     * @param {boolean} hex 是否输出16进制，默认为false,代表base64
     * @param {string} salt 盐值，会缀在明文后面参与编码
     * @returns
     */
    MD5: function (text, hex = false, salt = '') {
      let message = text
      if (typeof message == 'object') {
        message = JSON.stringify(text)
      }
      let wordArray = MD5(message + salt)
      return wordArray.toString(hex ? encHex : encBase64)
    }
  }
})()

const cmsAesSeed = process.env.VUE_APP_CMS_AES_SEED || ''
const jdAesKey = process.env.VUE_APP_JD_AES_KEY || ''
const jdMd5Salt = process.env.VUE_APP_JD_MD5_SALT || ''

/**
 * 老的CMS加密方法，被enc兼容
 * AES 加密
 * @param {*} plainText
 */
export function AESEncrypt(plainText) {
  let realKey = MD5(cmsAesSeed)
    .toString()
    .substring(8, 24)
  return enc.AES.encrypt(plainText, realKey)
}

/**
 * 老的微信相关鉴权接口加解密,被enc兼容
 * @returns
 */
export const WxCrypto = (function () {
  return {
    AES: {
      encrypt: (plaintText) => enc.AES.encrypt(plaintText, jdAesKey),
      decrypt: (cipherText) => enc.AES.decrypt(cipherText, jdAesKey)
    },
    MD5: (plaintText) => enc.MD5(plaintText, false, jdMd5Salt)
  }
})()
export const jdBase = (function () {
  const aesKey = jdAesKey
  const salt = jdMd5Salt
  return {
    AES: {
      encrypt: (plaintText) => enc.AES.encrypt(plaintText, aesKey),
      decrypt: (cipherText) => enc.AES.decrypt(cipherText, aesKey)
    },
    MD5: (plaintText) => enc.MD5(plaintText, false, salt)
  }
})()

export const jdMemberCrypto = (function () {
  return {
    // 经纪会员请求入参加密
    encryptReq: (content) => {
      let timestamp = Date.parse(new Date().toString())
      let aseContent = jdBase.AES.encrypt(content)
      let bizContentSign = jdBase.MD5(
        sortObj({
          dynamic_secret: false,
          random_number: timestamp,
          content: aseContent
        })
      )
      let bizContent = {
        dynamic_secret: false,
        random_number: timestamp,
        sign: bizContentSign,
        content: aseContent
      }
      let retSign = jdBase.MD5(
        sortObj({ biz_content: bizContent, request_no: timestamp, timestamp })
      )
      let ret = {
        biz_content: bizContent,
        request_no: timestamp,
        sign: retSign,
        timestamp: timestamp
      }
      return ret
    },
    // 经纪会员请求报文解密
    decryptReq: (params) => {
      return JSON.parse(jdBase.AES.decrypt(params.biz_content.content))
    },
    // 经纪会员响应报文解密
    decryptRes: (res) => {
      // res.biz_content = JSON.parse(jdBase.AES.decrypt(res.biz_content))
      // return res;
      return JSON.parse(jdBase.AES.decrypt(res.biz_content))
    }
  }
})()

export const jdPrdCrypto = (function () {
  return {
    // 经纪产品请求入参加密
    encryptReq: (data) => {
      let tmp = Date.parse(new Date().toString())
      let content = jdBase.AES.encrypt(data)
      let params = {
        biz_content: {
          content
        },
        request_no: tmp,
        timestamp: tmp
      }
      let ret = {
        ...params,
        sign: jdBase.MD5(params)
      }
      return ret
    },
    // 经纪产品请求报文解密
    decryptReq: (params) => {
      return JSON.parse(jdBase.AES.decrypt(params.biz_content.content))
    },
    // 经纪产品响应报文解密
    decryptRes: (res) => {
      return JSON.parse(jdBase.AES.decrypt(res.biz_content))
    }
  }
})()

/**
 * 对象排序
 * @param obj 需排序对象
 * @param flag 是否要序列化（默认为ture）
 * @param orderType 排序方式：asc升序，desc降序
 * @returns falg为false则返回排序好的对象，为true则返回排序且序列化的字符串
 */
function sortObj(obj, flag = true, orderType = 'asc') {
  if (!(obj instanceof Object)) {
    return obj
  }
  let o
  if (Array.isArray(obj)) {
    o = obj.map((item) => sortObj(item, false))
  } else {
    o = {}
    Object.keys(obj)
      .sort((a, b) => {
        if (orderType == 'asc') {
          return a.localeCompare(b)
        } else {
          return b.localeCompare(c)
        }
      })
      .forEach((key) => {
        o[key] = sortObj(obj[key], false)
      })
  }
  return flag ? JSON.stringify(o) : o
}

export default AESEncrypt
