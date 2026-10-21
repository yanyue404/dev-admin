<template>
  <div class="rate-container">
    <div class="rate-sticky">
      <div class="rate-tips">温馨提示：{{ rateConfig.tips }}</div>
      <div class="rate-control">
        <span
          v-for="(item, index) in filters"
          :key="index"
          class="rate-control-item"
          @click="showDialog(index)"
        >
          <span>{{ unite[index] | fieldName(item.fields) }}</span>
          <img src="@/assets/img/rate_down.png" />
        </span>
        <div v-if="isShowDialog" class="rate-dialog">
          <span
            v-for="(item, index) in filters[checkingIndex].fields"
            :key="index"
            @click="onSelected(index)"
          >
            {{ item.name }}
            <img
              v-show="item.value == unite[checkingIndex]"
              src="@/assets/img/rate_checked.png"
            />
          </span>
          <div class="triangle_border_up" :style="{ left: positionX + '%' }" />
        </div>
      </div>
      <div class="rate-box-top">
        <span>投保年龄</span>
        <span v-if="!column">保费</span>
        <template v-else>
          <span v-for="(item, index) in column.fields" :key="index">{{
            item.name
          }}</span>
        </template>
      </div>
    </div>
    <div class="rate-box" @click="isShowDialog = false">
      <div v-for="item in range" :key="item.rowKey" class="rate-box-item">
        <span>{{ item.rowKey }}</span>
        <span v-for="(item, index) in item.rowData" :key="index">{{
          item | formatMoney
        }}</span>
      </div>
    </div>
  </div>
</template>
<script>
import { mapState } from 'vuex'
import { formatMoney } from '../../utils/util'
import { isEmpty } from 'lodash'
export default {
  name: 'RateList',
  filters: {
    formatMoney,
    // 获取维度名称
    fieldName(value, fields) {
      const i = fields.findIndex((field) => field.value == value)
      return i != -1 ? fields[i].name : ''
    }
  },
  data() {
    return {
      // 版式
      schema: '',
      // 当前展示弹框对应筛选项索引
      checkingIndex: 0,
      // 是否展示弹窗
      isShowDialog: false
    }
  },
  computed: {
    ...mapState({
      rateConfig: (state) => state.rate.rateConfig
    }),
    // 当前所选维度的交集
    unite: {
      get() {
        return this.$store.state.rate.unite
      },
      set(val) {
        this.$store.commit('rate/updateUnite', val)
      }
    },
    // 顶部筛选维度数组
    filters() {
      const array = [...this.rateConfig.dimensions]
      this.rateConfig.inline !== '' && array.splice(this.rateConfig.inline, 1)
      return array
    },
    // 作为列表项的维度
    column() {
      return this.rateConfig.dimensions[this.rateConfig.inline]
    },
    // 数据索引
    dataIndex() {
      // unite 和 filter 初始值为空
      if (!this.unite || this.filters.length == 0) {
        return 0
      } else {
        return this.unite.split('').reduce((result, item, index) => {
          return (result +=
            item * (this.filters[index] ? this.filters[index].weight : 0))
        }, 0)
      }
    },
    positionX() {
      return (
        (this.checkingIndex * 100) / this.filters.length +
        100 / this.filters.length / 2
      )
    },
    // 列表数据
    range() {
      if (isEmpty(this.rateConfig.data)) return []
      const ret = []
      const indexArr = isEmpty(this.column)
        ? [this.dataIndex]
        : this.column.fields.map((field) => {
            return this.dataIndex + field.value * this.column.weight
          })
      const rowKeys = Object.keys(this.rateConfig.data)
      for (const rowKey of rowKeys) {
        const rowData = indexArr
          .map((index) => {
            return this.rateConfig.data[rowKey][index]
          })
          .filter((item) => !!item)
        if (rowData.length > 0) {
          ret.push({
            rowKey,
            rowData
          })
        }
      }
      return ret
    }
  },
  mounted() {},
  methods: {
    showDialog(index) {
      this.isShowDialog = true
      this.checkingIndex = index
    },
    onSelected(index) {
      this.unite = changeStr(
        this.unite,
        this.checkingIndex,
        this.filters[this.checkingIndex].fields[index].value
      )
      this.isShowDialog = false
    }
  }
}
/**
 * 修改字符串指定位置为指定字符
 */
function changeStr(str = '', index = 0, char) {
  const array = str.split('')
  array[index] = char
  return array.join('')
}
</script>

<style lang="scss" scoped>
.rate-container {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
}
.rate-sticky {
  position: sticky;
  top: 0px;
  left: 0px;
  width: 100%;
  border-bottom: 1px solid #ddd;

  .rate-tips {
    width: 100%;
    height: 36px;
    font-size: 12px;
    line-height: 36px;
    text-align: center;
    box-sizing: border-box;
    background-color: #ff6600;
    color: #fff;
  }
  .rate-control {
    display: flex;
    align-items: center;
    justify-content: space-around;
    width: 100%;
    height: 48px;
    background-color: #fff;
    color: #ff6600;
    position: relative;

    .rate-control-item {
      flex: 1;
      font-size: 14px;
      white-space: nowrap;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #333;

      img {
        width: 14px;
        height: 8px;
        margin-left: 4px;
      }
    }
  }
  .rate-box-top {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    height: 48px;
    width: 100%;
    display: flex;
    align-items: center;
    border-top: 1px solid #ddd;
    background: #fff;

    span {
      flex-grow: 1;
      flex-shrink: 0;
      text-align: center;
      max-width: 33.33%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
  }
  .rate-dialog {
    position: absolute;
    z-index: 3;
    width: 100%;
    background-color: #fff;
    box-sizing: border-box;
    border: 1px solid #ff6600;
    left: 0;
    top: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;

    span {
      display: flex;
      box-sizing: border-box;
      height: 48px;
      align-items: center;
      font-size: 14px;
      color: #333;
      width: calc(100% - 20px);
      flex-shrink: 0;

      img {
        width: 18px;
        height: 12px;
        margin-left: 6px;
      }
    }

    span:first-child {
      border-bottom: 1px solid #ddd;
      background-color: #fff;
    }

    .triangle_border_up {
      width: 12px;
      height: 12px;
      border: 1px solid #ff6600;
      background-color: #fff;
      position: absolute;
      z-index: -2;

      transform: translate(-50%, 50%) rotate(45deg);
      top: -12px;
      transition: left 0.3s ease;
    }
  }
}

.rate-box {
  width: 100%;
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  .rate-box-item {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    height: 40px;
    width: 100%;
    display: flex;
    align-items: center;

    &:nth-child(odd) {
      background-color: #f7f7f7;
    }

    span {
      flex-grow: 1;
      flex-shrink: 0;
      text-align: center;
      max-width: 33.33%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
  }
}
</style>
