<template>
  <div class="main-conatainer">
    <el-card>
      <el-steps :active="step" simple>
        <el-step title="excel导入" icon="el-icon-upload"></el-step>
        <el-step title="配置费率表" icon="el-icon-edit"></el-step>
        <el-step title="完成" icon="el-icon-s-data"></el-step>
      </el-steps>
      <el-container>
        <el-main>
          <div v-show="step == 0">
            <el-upload
              class="upload-demo"
              drag
              :show-file-list="false"
              :before-upload="handleFile"
              :accept="'.xls,.xlsx'"
              action="#"
            >
              <i class="el-icon-upload"></i>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <div class="el-upload__tip" slot="tip">
                只能导入xls、xlsx文件，下载费率表格模板请<el-link
                  type="primary"
                  href="xlsx/template.xlsx"
                  >点击此处<i class="el-icon-download"></i>
                </el-link>
              </div>
            </el-upload>
          </div>
          <div v-show="step == 1" class="div-step-2">
            <el-card>
              <div slot="header">
                <span>保费维度</span>
              </div>
              <vuedraggable
                class="wrapper"
                v-model="rateConfig.dimensions"
                animation="300"
              >
                <transition-group>
                  <div
                    v-for="(o, index) in rateConfig.dimensions"
                    :key="o.weight"
                    class="dimention-row"
                  >
                    <el-tooltip
                      :content="
                        rateConfig.inline === index
                          ? '作为列表项展示'
                          : '作为筛选项展示'
                      "
                      placement="top"
                    >
                      <el-switch
                        :value="rateConfig.inline === index"
                        @change="
                          $set(rateConfig, 'inline', $event ? index : '')
                        "
                      >
                      </el-switch>
                    </el-tooltip>
                    <vuedraggable
                      class="wrapper"
                      v-model="o.fields"
                      animation="300"
                      :disabled="editIndex"
                    >
                      <transition-group>
                        <div
                          v-for="(item, i) in o.fields"
                          :key="item.value"
                          class="dimension-item"
                        >
                          <el-input
                            class="dimension-item-input"
                            v-show="editIndex == index + '' + i"
                            v-model="item.name"
                            size="small"
                            @blur="editIndex = ''"
                          />
                          <el-tag
                            v-show="editIndex != index + '' + i"
                            :color="colorList[index % colorList.length]"
                            effect="dark"
                            class="dimension-item-tag"
                          >
                            {{ item.name }}
                            <i
                              class="el-icon-edit"
                              @click="editIndex = index + '' + i"
                            ></i>
                          </el-tag>
                        </div>
                      </transition-group>
                    </vuedraggable>
                  </div>
                </transition-group>
              </vuedraggable>
            </el-card>
            <div class="mobile-wrap" v-if="step == 1">
              <rate-list> </rate-list>
            </div>
          </div>
          <div v-if="step == 2" class="div-step-3">
            <el-card>
              <div slot="header">
                <span>JSON文本</span>
              </div>
              <div v-highlight class="div-code">
                <pre>
                  <code class="json">{{rateConfig}}</code>
                </pre>
              </div>
            </el-card>
          </div>
        </el-main>
        <el-footer id="footer">
          <el-button v-show="step !== 0" type="primary" @click="preStep()"
            >上一步</el-button
          >
          <el-button v-show="step == 1" type="primary" @click="nextStep()"
            >下一步</el-button
          >
          <el-button
            id="copy-json"
            :data-clipboard-text="JSON.stringify(rateConfig)"
            v-show="step == 2"
            type="success"
            @click="confirm()"
            >完成并复制</el-button
          >
        </el-footer>
      </el-container>
    </el-card>
  </div>
</template>
e
<script>
import { mapMutations } from 'vuex'
import vuedraggable from 'vuedraggable'
import rateList from '@/components/RateList'
export default {
  name: 'ImportRate',
  components: {
    vuedraggable,
    rateList
  },
  data() {
    return {
      colorList: ['#409eff', '#67c23a', '#f56c6c', '#e6a23c'],
      editIndex: ''
    }
  },
  computed: {
    rateConfig: {
      get() {
        return this.$store.state.rate.rateConfig
      },
      set(val) {
        this.$store.commit('rate/updateRateConfig', val)
      }
    },
    step: {
      get() {
        return this.$store.state.rate.step
      },
      set(val) {
        this.$store.commit('rate/updateStep', val)
      }
    }
  },
  watch: {
    step: {
      handler: function (step) {
        this.updateShowMobile(step == 1)
      },
      immediate: true
    }
  },
  updated() {
    // highlightCode();
  },
  mounted() {
    this.$cms.context.$on('initRateConfig', (data) => {
      if (!data) {
        this.updateStep(0)
      } else {
        this.updateStep(1)
        this.updateRateConfig(data)
      }
    })
  },
  methods: {
    ...mapMutations({
      updateShowMobile: 'rate/updateShowMobile',
      updateStep: 'rate/updateStep',
      updateRateConfig: 'rate/updateRateConfig'
    }),
    handleFile(file) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target.result
          //exceljs
          const workbook = new ExcelJS.Workbook()
          await workbook.xlsx.load(data)
          const worksheet = workbook.worksheets[0]
          const rows = worksheet.getRows(0, worksheet.rowCount)
          let dataRows = {}
          let dataColumns = []
          let rowFlag = false
          for (const row of rows) {
            let notNullIndex = row.values.findIndex(
              (item) => item && item != '\n'
            )
            const values = row.values.slice(notNullIndex)
            if (notNullIndex != -1 && values.length != 0) {
              if (rowFlag) {
                dataRows[values[0]] = values.slice(1)
              } else {
                dataColumns.push(Array.from(new Set(values)))
                values[0] === '投保年龄' &&
                  dataColumns[dataColumns.length - 1].shift() &&
                  (rowFlag = true)
              }
            }
          }
          dataColumns.reverse().reduce((ret, item, index) => {
            dataColumns[index] = {
              weight: ret,
              fields: item.map((field, i) => {
                return {
                  name: field,
                  value: i
                }
              })
            }
            return ret * item.length
          }, 1)

          this.rateConfig = {
            dimensions: dataColumns.reverse(),
            data: dataRows
          }
          //跳转下一步
          this.nextStep()
        } catch (error) {
          console.log(error)
          this.$message({ message: '模板解析失败', type: 'error' })
        }
      }
      reader.readAsBinaryString(file)
      return Promise.reject()
    },
    nextStep() {
      this.step = (this.step + 1) % 3
    },
    confirm() {
      let clipboard = new ClipboardJS('#copy-json')
      clipboard.on('success', () => {
        this.$message({ message: '复制成功' })
        clipboard.destroy()
        //通知配置完成
        this.$cms.rateConfigDone(this.rateConfig)
      })
      clipboard.on('error', (error) => {
        console.log(error)
        clipboard.destroy()
      })
    },
    preStep() {
      this.step = (this.step - 1) % 3
    }
  }
}
function highlightCode() {
  // 遍历元素并且使用 highlight 进行处理
  const preEl = document.querySelectorAll('pre code')
  preEl.forEach((el) => {
    hljs.highlightBlock(el)
  })
}
</script>
<style lang="scss" scoped>
.el-upload__tip {
  display: flex;
  align-items: center;

  a {
    font-size: inherit;
  }
}
#footer {
  display: flex;
  align-items: center;
  justify-content: center;
}
.div-step-2,
.div-step-3 {
  font-size: 16px;
}
.div-step-2 {
  display: flex;
  .el-card {
    flex: 1;
    margin-right: 20px;
  }
  .mobile-wrap {
    min-width: 375px;
    height: 667px;
    box-sizing: content-box;
    padding: 20px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  }
}
.dimention-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  padding: 12px 0 12px 0;
  border-bottom: 1px solid #dcdfe6;
  &:first-child {
    padding-top: 0;
  }
  .wrapper > span:first-child {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .dimension-item {
    margin-left: 20px;
    .dimension-item-tag {
      border: none;
      cursor: pointer;
    }
    .dimension-item-input {
      width: 150px;
    }
  }
}
.div-code pre {
  margin-top: 0 !important;

  code {
    font-size: 14px !important;
    background-color: #f5f7fa !important;
    height: 400px !important;
    padding: 0 !important;
    .hljs-attr {
      color: #409eff;
    }
  }
}
</style>
