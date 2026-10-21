const state = {
  globalVar: 1,
  showMobile: false,
  //费率配置
  rateConfig: {
    //维度数组
    dimensions: [],
    //列表项维度索引
    inline: '',
    //表数据
    data: {},
    tips: '您可使用下方标签切换保费显示维度'
  },
  unite: '',
  step: 0
}

const mutations = {
  updateGlobalVar(state, val) {
    state.globalVar = val
  },
  updateShowMobile(state, val) {
    state.showMobile = val
  },
  updateRateConfig(state, val) {
    state.rateConfig = { ...state.rateConfig, ...val }
    if (!state.unite) {
      state.unite = new Array(state.rateConfig.dimensions.length)
        .fill('0')
        .join('')
    }
  },
  updateUnite(state, val) {
    state.unite = val
  },
  updateStep(state, val) {
    state.step = val
  }
}

export default {
  namespaced: true,
  state,
  mutations
}
