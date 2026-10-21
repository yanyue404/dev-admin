import Vue from 'vue'
class cmsBridge {
  constructor() {
    this.context = new Vue()
    window.addEventListener('message', (event) => {
      const {
        data: { method, data }
      } = event
      if (!method) return
      switch (method) {
        case 'inCms': {
          this.inCms = true
          //发送loaded事件
          this._send('loaded')
          break
        }
        case 'initRateConfig': {
          this.context.$emit('initRateConfig', data)
        }
      }
    })
  }

  /**
   * 通知费率表配置完成
   */
  rateConfigDone(data) {
    this._send('rateConfigDone', JSON.stringify(data))
  }

  _send(method, data) {
    window.parent != window &&
      this.inCms &&
      window.parent.postMessage(
        {
          method,
          data,
          timestamp: new Date().getTime()
        },
        '*'
      )
  }
}

export default new cmsBridge()
