/*常用逻辑处理工具函数*/

import { isObject, isFunction } from 'lodash'
/**
 * 异步加载视图组件
 * @param {*} 视图组件名
 * @returns
 */
export function getComponent(component) {
  return (resolve) => {
    import(/* webpackChunkName: "views/[request]" */ `@/views/${component}.vue`).then((module) => {
      resolve(module)
    })
  }
}

/**
 * 判断是否为空
 * @param {*} value
 * @returns {Boolean}
 */
export function isDefined(value) {
  if (
    value == null ||
    value == '' ||
    value == 'undefined' ||
    value == undefined ||
    value == 'null' ||
    value == '(null)' ||
    value == 'NULL' ||
    typeof value == 'undefined'
  ) {
    return false
  } else {
    value = value + ''
    value = value.replace(/\s/g, '')
    if (value == '') {
      return false
    }
    return true
  }
}

/**
 * form vue
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
export function looseEqual(a, b) {
  if (a === b) return true
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    try {
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        return (
          a.length === b.length &&
          a.every((e, i) => {
            return looseEqual(e, b[i])
          })
        )
      } else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
      } else if (!isArrayA && !isArrayB) {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        return (
          keysA.length === keysB.length &&
          keysA.every((key) => {
            return looseEqual(a[key], b[key])
          })
        )
      } else {
        return false
      }
    } catch (e) {
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b)
  } else {
    return false
  }
}

export function trimAll(str) {
  if (!str) {
    return ''
  }
  return str.replace(/\s+/g, '')
}

/* 计算字符串长度(英文占1个字符，中文汉字占2个字符) */
export function getStrLen(str) {
  var strlength = str.length
  for (var i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
      // 判断输入的是否是汉字，如果是汉字的话，则字符串长度加2
      strlength += 1
    }
  }
  return strlength
}

/* 手机号 脱敏 补星 185 **** 4008 */
export function desensitizePhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

export function toTwo(n) {
  return n < 10 ? '0' + n : '' + n
}

/**
 * modifyStrPunctuation，只保留连续字符中的第一个特殊字符(数字算特殊字符)
 * @param {str} name 原值
 * @return {str}     新值
 * @example  modifyStrPunctuation(马,,._安徽$~哈!)  结果: 马,安徽$哈!
 */
export function modifyStrPunctuation(name) {
  var newName = this.trimAll(name)
  var name1 = ''
  var test1 = /[\u4e00-\u9fa5]/
  var test2 = /[a-zA-Z]/
  var isFirst = true
  for (var i = 0; i < newName.length; i++) {
    var c = newName.charAt(i)
    if (test1.test(c) || test2.test(c) || /\s/.test(c)) {
      name1 += c
      isFirst = true
    } else {
      if (isFirst) {
        name1 += c
        isFirst = false
      }
    }
  }
  newName = name1

  var name3 = ''
  isFirst = true
  for (var n = 0; n < newName.length; n++) {
    var d = newName.charAt(n)
    if (/\s/.test(d)) {
      if (isFirst) {
        name3 += d
        isFirst = false
      }
    } else {
      name3 += d
      isFirst = true
    }
  }
  newName = name3

  var name2 = ''
  for (var m = 0; m < newName.length; m++) {
    var q = newName.charAt(m)
    if (/\s/.test(q)) {
      var p = newName.charAt(m - 1)
      var r = newName.charAt(m + 1)
      if (test2.test(p) && test2.test(r)) {
        name2 += q
      }
    } else {
      name2 += q
    }
  }
  return name2
}

/**
 * utf16转utf8
 * @param {str}
 */
export function utf16to8(str) {
  var out, i, len, c
  out = ''
  len = str.length
  for (i = 0; i < len; i++) {
    c = str.charCodeAt(i)
    if (c >= 0x0001 && c <= 0x007f) {
      out += str.charAt(i)
    } else if (c > 0x07ff) {
      out += String.fromCharCode(0xe0 | ((c >> 12) & 0x0f))
      out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f))
      out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f))
    } else {
      out += String.fromCharCode(0xc0 | ((c >> 6) & 0x1f))
      out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f))
    }
  }
  return out
}
/**
 * utf8转utf16
 * @param {str} str
 */
export function utf8to16(str) {
  var out, i, len, c
  var char2, char3
  out = ''
  len = str.length
  i = 0
  while (i < len) {
    c = str.charCodeAt(i++)
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        // 0xxxxxxx
        out += str.charAt(i - 1)
        break
      case 12:
      case 13:
        // 110x xxxx 10xx xxxx
        char2 = str.charCodeAt(i++)
        out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f))
        break
      case 14:
        // 1110 xxxx10xx xxxx10xx xxxx
        char2 = str.charCodeAt(i++)
        char3 = str.charCodeAt(i++)
        out += String.fromCharCode(
          ((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0)
        )
        break
    }
  }
  return out
}

export function loadJs(url, callback, attr) {
  if (!isFunction(callback)) {
    attr = callback
    callback = null
  }
  return new Promise((resolve, reject) => {
    var script = document.createElement('script')
    script.type = 'text/javascript'
    if (isObject(attr)) {
      Object.keys(attr).forEach((key) => {
        if (attr.hasOwnProperty(key)) {
          script.setAttribute(key, attr[key])
        }
      })
    }
    if (script.readyState) {
      script.onreadystatechange = function () {
        if (script.readyState == 'loaded' || script.readyState == 'complete') {
          script.onreadystatechange = null
          isFunction(callback) && callback()
          resolve()
        }
      }
    } else {
      script.onload = function () {
        isFunction(callback) && callback()
        resolve()
      }
    }
    script.onerror = function () {
      reject()
    }
    script.src = url
    document.head.appendChild(script)
  })
}

/**
 * 格式化金额
 * @param {number} number 待格式化金额
 * @param {number} precision 小数位精度
 * @param {string} symbol 钱币标识
 * @returns
 */
export function formatMoney(number, { precision = 2, symbol = '￥' } = {}) {
  if (number === undefined || number === null || number === '' || isNaN(number))
    return ''
  const negative = number < 0 ? '-' : ''
  const [integer, decimal] = toFixed(Math.abs(number), precision).split('.')
  const mod = integer.length > 3 ? integer.length % 3 : 0
  return (
    symbol +
    negative +
    (mod ? integer.substr(0, mod) + ',' : '') +
    integer.substr(mod).replace(/(\d{3})(?=\d)/g, '$1,') +
    (decimal ? '.' + decimal : '')
  )
}

/**
 * 按指定精度格式化小数
 * @param {number} number 待格式化数字
 * @param {number} precision 精度
 * @returns
 */
export function toFixed(number, precision) {
  const val = Math.round(Math.abs(precision))
  precision = isNaN(val) ? 2 : precision
  const power = Math.pow(10, precision)
  return (Math.round((number + 1e-8) * power) / power).toFixed(precision)
}

/**
 *
 * @param {Function} fn 需要锁定的异步方法
 * @returns
 */
export function runtimeLock(fn) {
  let lock = false
  let ret
  return async function (...arg) {
    if (lock) {
      return ret
    }
    lock = true
    await (ret = fn.call(this, ...arg))
    lock = false
    return ret
  }
}
