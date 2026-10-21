<template>
  <div class="dashboard-container">
    <!-- 标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <i class="el-icon-postcard icon-accent"></i>
        <span class="header-title">证件号码生成工具</span>
        <el-tag v-if="idCode && idCode !== '请选择地区' && idCode !== '请选择生日'" size="mini" type="success" effect="dark">{{ idCode }}</el-tag>
      </div>
      <div class="header-right">
        <el-button size="small" icon="el-icon-refresh" type="primary" @click="updateIdCode">刷新号码</el-button>
        <el-button size="small" icon="el-icon-document-copy" type="success" @click="copyNum">复制号码</el-button>
      </div>
    </div>

    <!-- 主表单区 — 双列卡片 -->
    <div class="form-grid">
      <div class="section-card">
        <div class="section-title"><i class="el-icon-files"></i> 基本信息</div>
        <el-form ref="form" label-width="100px" size="small">
          <el-form-item label="证件类型：">
            <el-select v-if="isMobile" v-model="cardType" placeholder="请选择证件类型" style="width: 100%">
              <el-option v-for="item in cardTypeRange" :key="item.value" :label="item.label" :value="item.value"></el-option>
            </el-select>
            <el-radio-group v-model="cardType" v-else>
              <el-radio v-for="item in cardTypeRange" :key="item.value" :label="item.value">{{ item.label }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="签发地区：">
            <el-cascader v-model="code" :options="codeData" :props="{ expandTrigger: 'hover' }" @change="handleChange" style="width: 100%"></el-cascader>
          </el-form-item>
          <el-form-item label="国籍：" v-show="cardType === 2 || cardType === 3">
            <el-select :value="nationIndex" @change="onNationChange" filterable default-first-option placeholder="请选择国籍" style="width: 100%">
              <el-option v-for="(item, index) in nationList" :key="item.codeThree" :label="item.chName" :value="index"></el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <div class="section-card">
        <div class="section-title"><i class="el-icon-user"></i> 人员信息</div>
        <el-form label-width="100px" size="small">
          <el-form-item label="姓名：">
            <el-input v-model="name" style="width: 200px"></el-input>
          </el-form-item>
          <el-form-item label="性别：">
            <el-radio-group v-model="sex">
              <el-radio label="男">男</el-radio>
              <el-radio label="女">女</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="生日/年龄：">
            <div class="birthday-row">
              <span class="switch-label">使用生日</span>
              <el-switch v-model="useBrith" active-color="#409eff"></el-switch>
            </div>
            <el-date-picker v-if="useBrith" v-model="date" align="right" type="date" placeholder="选择生日" :picker-options="pickerOptions" size="small" style="width: 100%"></el-date-picker>
            <div v-else class="age-container">
              <el-input v-model="year" type="number" size="small" placeholder="岁"></el-input>
              <span class="age-unit">岁</span>
              <el-input v-model="month" type="number" size="small" placeholder="月"></el-input>
              <span class="age-unit">月</span>
              <el-input v-model="dateDay" type="number" size="small" placeholder="天"></el-input>
              <span class="age-unit">天</span>
            </div>
          </el-form-item>
          <el-form-item label="头像：">
            <el-select v-model="avatar" placeholder="请选择证件头像" size="small" style="width: 200px">
              <el-option v-for="item in avatarOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <div class="section-card">
        <div class="section-title"><i class="el-icon-postcard"></i> 证件号码</div>
        <el-form label-width="100px" size="small">
          <el-form-item label="手动输入：">
            <el-switch v-model="useInput" active-color="#e6a23c"></el-switch>
          </el-form-item>
          <el-form-item label="证件号码：">
            <div class="idcode-row">
              <el-input v-if="useInput" v-model="idCode" style="width: 220px"></el-input>
              <span v-else class='card-text'>{{ idCode }}</span>
              <el-button type="primary" size="mini" icon="el-icon-refresh" @click="updateIdCode">刷新</el-button>
              <el-button type="warning" size="mini" icon="el-icon-postcard" @click="showCardPreview = true">生成证件照</el-button>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <div class="section-card">
        <div class="section-title"><i class="el-icon-date"></i> 有效期</div>
        <el-form label-width="100px" size="small">
          <el-form-item label="有效期类型：">
            <el-radio-group v-model="expirationDateType">
              <el-radio label="短期">短期</el-radio>
              <el-radio label="长期">长期</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="有效期日期：">
            <el-date-picker v-model="expirationDate" type="daterange" unlink-panels range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" size="small" style="width: 100%"></el-date-picker>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 证件照预览 — 折叠次要区域 -->
    <div class="card-preview-section">
      <div class="collapse-toggle" @click="showCardPreview = !showCardPreview">
        <i :class="showCardPreview ? 'el-icon-arrow-down' : 'el-icon-arrow-right'"></i>
        <span>证件照片预览</span>
        <el-tag size="mini" effect="plain">{{ cardType === 1 ? '身份证' : '永居证' }}</el-tag>
      </div>

      <div v-show="showCardPreview" class="card-preview-body">
        <!-- 身份证 -->
        <div v-if="cardType == 1" class="idcard-box sfz">
          <div class="idcard-image-item" ref="frontIdCard">
            <img class="idcard-bg" src="@/assets/img/front.png" alt="">
            <img class="avatar" :src="idCardInfo.avatar" alt="">
            <div class="txt-content sfz">
              <span class="txt txt-name">{{ idCardInfo.name }}</span>
              <span class="txt txt-sex">{{ idCardInfo.gender }}</span>
              <span class="txt txt-nation">{{ idCardInfo.nation }}</span>
              <span class="txt txt-year">{{ idCardInfo.year }}</span>
              <span class="txt txt-month">{{ idCardInfo.month }}</span>
              <span class="txt txt-day">{{ idCardInfo.day }}</span>
              <span class="txt txt-address">{{ idCardInfo.address }}</span>
              <span class="txt txt-idCode">{{ idCardInfo.idCode }}</span>
            </div>
          </div>
          <div class="idcard-image-item" ref="backIdCard">
            <img class="idcard-bg" src="@/assets/img/back.png" alt="">
            <div class="txt-content sfz">
              <span class="txt txt-signPart">{{ idCardInfo.signPart }}</span>
              <span class="txt txt-validPeriod">{{ idCardInfo.validPeriod }}</span>
            </div>
          </div>
        </div>

        <!-- 永居证 -->
        <div v-else class="idcard-box yjz">
          <div class="idcard-image-item yjz" ref="frontYjzCard">
            <img class="idcard-bg" src="@/assets/img/yjz-front.png" alt="">
            <img class="avatar" :src="idCardInfo.avatar" alt="">
            <div class="txt-content yjz">
              <span class="txt txt-name-pinyin">{{ idCardInfo.namePinyin }}</span>
              <span class="txt txt-name-hanzi">{{ idCardInfo.name }}</span>
              <span class="txt txt-sex">{{ idCardInfo.gender }} / {{ idCardInfo.gender == '男' ? 'M' : 'F' }}</span>
              <span class="txt txt-birth">{{ idCardInfo.year }}.{{ idCardInfo.month }}.{{ idCardInfo.day }}</span>
              <span class="txt txt-nation">{{ idCardInfo.nationChName }} / {{ idCardInfo.nationCodeThree }}</span>
              <span class="txt txt-validPeriod">{{ idCardInfo.validPeriod }}</span>
              <span class="txt txt-idCode">{{ idCardInfo.idCode }}</span>
            </div>
          </div>
          <div class="idcard-image-item yjz" ref="backYjzCard">
            <img class="idcard-bg" src="@/assets/img/yjz-back.png" alt="">
          </div>
        </div>

        <div class="card-actions">
          <el-button size="small" icon="el-icon-download" @click="downloadIdCardImage('front')">下载正面</el-button>
          <el-button size="small" icon="el-icon-download" @click="downloadIdCardImage('back')">下载反面</el-button>
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div v-show="!isMobile && idCodes.length" class="history-section">
      <div class="collapse-toggle" @click="showHistory = !showHistory">
        <i :class="showHistory ? 'el-icon-arrow-down' : 'el-icon-arrow-right'"></i>
        <span>生成历史</span>
        <el-tag size="mini" type="info" effect="plain">{{ idCodes.length }} 条</el-tag>
      </div>
      <div v-show="showHistory" class="history-list">
        <div v-for="(item, index) in idCodes" :key="index" class="history-item" @click="copyHistoryItem(item.idCode)">
          <span class="history-id">{{ item.idCode }}</span>
          <span class="history-meta">{{ item.sex }} · {{ item.date }}</span>
          <i class="el-icon-document-copy history-copy"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { dateFormat, getRangeToDate } from "@/utils/date";
import { NATION_LIST } from "./code"
import html2canvas from "html2canvas"
import pinyin from "tiny-pinyin";

const avatarOptions = [
  { value: '1', label: '头像男1', image: require("@/assets/icard/man01.png") },
  { value: '2', label: '头像男2', image: require("@/assets/icard/man02.png") },
  { value: '3', label: '头像男3', image: require("@/assets/icard/man03.png") },
  { value: '4', label: '头像男4', image: require("@/assets/icard/man04.png") },
  { value: '5', label: '头像女1', image: require("@/assets/icard/woman01.png") },
  { value: '6', label: '头像女2', image: require("@/assets/icard/woman02.png") },
  { value: '7', label: '头像女3', image: require("@/assets/icard/woman03.png") },
  { value: '8', label: '头像女4', image: require("@/assets/icard/woman04.png") },
]

const loadCode = () => import("./code.js");

function getCard(code, date, sex) {
  date = date || new Date();
  let random = Math.random().toString().substr(2, 2);
  let sexPos = parseInt(Math.random() * 4) * 2 + (sex == "男" ? 1 : 0);
  let id = code.toString() + dateFormat("yyyyMMdd", date) + random + sexPos;
  let S =
    [7, 9, 10, 5, 8, 4, 2].reduce(
      (sum, item, index) => sum + (parseInt(id[index]) + parseInt(id[index + 10])) * item,
      0
    ) + [1, 6, 3].reduce((sum, item, index) => sum + parseInt(id[index + 7]) * item, 0);
  id += "10X98765432".substr(S % 11, 1);
  return id;
}

function getForeigner(area, date, sex, nation = {}, old = false) {
  let random = Math.random().toString().substr(2, 2);
  let sexPos = parseInt(Math.random() * 4) * 2 + (sex == "男" ? 1 : 0);
  let id = '9' + area.substr(0, 2) + nation.codeNumber + dateFormat("yyyyMMdd", date) + random + sexPos;
  let S =
    [7, 9, 10, 5, 8, 4, 2].reduce(
      (sum, item, index) => sum + (parseInt(id[index]) + parseInt(id[index + 10])) * item,
      0
    ) + [1, 6, 3].reduce((sum, item, index) => sum + parseInt(id[index + 7]) * item, 0);
  const valiCode = (old ? "10098765432" : "10X98765432").substr(S % 11, 1);
  if (old) {
    id = nation.codeThree + area.substr(0, 2) + '00' + dateFormat("yyMMdd", date) + sexPos + valiCode;
  } else {
    id += valiCode
  }
  return id
}

export default {
  name: "Cardlet",
  data() {
    return {
      name: '测试',
      useBrith: false,
      useInput: false,
      year: 0,
      month: 0,
      dateDay: 30,
      idCodes: [],
      url: "",
      avatar: '1',
      date: new Date(),
      expirationDate: [],
      avatarOptions,
      pickerOptions: {
        disabledDate(time) {
          return time.getTime() > Date.now();
        },
      },
      sex: "男",
      expirationDateType: "短期",
      code: ["110000", "110100", "110114"],
      codeData: null,
      idCode: "",
      cardType: 1,
      nationList: NATION_LIST,
      nationIndex: 0,
      isMobile: false,
      showCardPreview: false,
      showHistory: true,
      cardTypeRange: [{
        value: 1,
        label: "身份证"
      }, {
        value: 2,
        label: "外国人永居证(新版18位)"
      }, {
        value: 3,
        label: "外国人永居证(旧版15位)"
      }]
    };
  },
  computed: {
    idCodeParams() {
      let { code, sex, date, useBrith, year, month, dateDay, cardType, nationIndex } = this;
      if (!useBrith) {
        date = getRangeToDate({ y: -year, m: -month, d: -dateDay });
      }
      return { code: code && code[code.length - 1], sex, date, cardType, nationIndex };
    },
    validPeriodText() {
      let ret = ''
      let dateRegexp = /(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})/
      if (this.expirationDate || this.expirationDate.length > 0) {
        let { year: startYear, month: startMonth, day: startDay } = dateFormat("yyyy-MM-dd", this.expirationDate[0]).match(dateRegexp).groups
        let { year: endYear, month: endMonth, day: endDay } = dateFormat("yyyy-MM-dd", this.expirationDate[1]).match(dateRegexp).groups
        let endDate = this.expirationDateType == '短期' ? `${endYear}.${endMonth}.${endDay}` : '长期'
        ret = `${startYear}.${startMonth}.${startDay}-${endDate}`
      } else {
        let { year, month, day } = dateFormat("yyyy-MM-dd", date).match(dateRegexp).groups
        ret = `${year}.${month}.${day}-${year * 1 + 20}.${month}.${day}`
      }
      return ret
    },
    idCardInfo() {
      let { code, sex, date, nationIndex, cardType } = this.idCodeParams
      let dateRegexp = /(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})/
      let { year, month, day } = dateFormat("yyyy-MM-dd", date).match(dateRegexp).groups
      let avatar = this.avatarOptions.find((item) => item.value == this.avatar)?.image
      return {
        name: this.name,
        namePinyin: this.convertToPinyin(this.name),
        avatar,
        gender: sex,
        nation: '汉',
        nationChName: this.nationList[nationIndex].chName,
        nationCodeThree: this.nationList[nationIndex].codeThree,
        year,
        month,
        day,
        address: this.getAddressText(),
        idCode: this.idCode,
        signPart: this.getAddressText(),
        validPeriod: this.validPeriodText
      }
    },
  },
  watch: {
    idCodeParams() {
      this.updateIdCode();
    },
  },
  created() {
    this.isMobile = window.matchMedia("screen and (max-width:540px)").matches;
  },
  mounted() {
    loadCode().then((res) => {
      function getCode(key, data) {
        let listObj = data[key];
        delete data[key];
        return Object.keys(listObj).map((key) => {
          return {
            value: key,
            label: listObj[key],
            children: data[key] ? getCode(key, data) : undefined,
          };
        });
      }
      this.data = JSON.parse(JSON.stringify(res.IDCARD_AREA));
      this.codeData = getCode("86", res.IDCARD_AREA);
      this.updateIdCode();
    });
  },
  methods: {
    convertToPinyin(value) {
      if (!value) return value;
      if (!pinyin.isSupported()) return value;
      return pinyin.convertToPinyin(value, ", ", true).toUpperCase();
    },
    updateIdCode() {
      let { code, sex, date, nationIndex, cardType } = this.idCodeParams;
      if (!code) {
        return (this.idCode = "请选择地区");
      }
      if (!date) {
        return (this.idCode = "请选择生日");
      }
      if (cardType === 1) {
        this.idCode = getCard(code.toString(), date, sex);
        this.idCodes.unshift({ idCode: this.idCode, sex: sex, date: dateFormat("yyyy-MM-dd", date), address: this.getAddressText() });
      } else if (cardType === 2 || cardType === 3) {
        const nation = this.nationList[nationIndex]
        this.idCode = getForeigner(code.toString(), date, sex, nation, cardType === 3);
        this.idCodes.unshift({ idCode: this.idCode, sex: sex, date: dateFormat("yyyy-MM-dd", date), address: this.getAddressText(), nation: nation.chName });
      }
    },
    handleChange(...e) {
      console.log("handleChange ==> ", e);
    },
    onNationChange(index) {
      this.nationIndex = index
    },
    getAddressText() {
      let tmp = (this.data || {})["86"] || {};
      let addres = this.code.reduce((addr, item) => {
        addr += tmp[item];
        tmp = this.data[item];
        return addr;
      }, "");
      return addres
    },
    copyNum() {
      navigator.clipboard.writeText(this.idCode).then(() => {
        this.$message.success('复制成功！')
      }).catch(() => {
        this.$message.warning('复制失败，请手动复制')
      })
    },
    copyHistoryItem(idCode) {
      navigator.clipboard.writeText(idCode).then(() => {
        this.$message.success('已复制: ' + idCode)
      }).catch(() => {
        this.$message.warning('复制失败')
      })
    },
    generateCard() {
      this.showCardPreview = true
    },
    downloadIdCardImage(type) {
      html2canvas(this.$refs[`${type}${this.cardType === 1 ? 'Id' : 'Yjz'}Card`],
        { width: 540, height: 340, allowTaint: true, useCORS: true, scale: 1, dpi: 1200 }
      ).then(canvas => {
        const file = document.createElement("a")
        file.style.display = "none"
        file.href = canvas.toDataURL()
        file.download = decodeURI(`${this.cardType === 1 ? '身份证' : '永居证'}${this.idCode}${type == 'front' ? '正面' : '反面'}.png`);
        document.body.appendChild(file)
        file.click();
        document.body.removeChild(file)
      })
    }
  },
};
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 16px;
  height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
  gap: 12px;
}

/* 页面标题栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--card-bg);
  border-radius: 10px;
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-sm);

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .icon-accent {
    font-size: 22px;
    color: #e6a23c;
  }

  .header-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

/* 双列表单区 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.section-card {
  background: var(--card-bg);
  border-radius: 10px;
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-sm);
  padding: 14px 16px 8px;

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-lighter);
    margin-bottom: 12px;

    i {
      margin-right: 4px;
      color: #409eff;
    }
  }
}

/* 年龄输入行 */
.birthday-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;

  .switch-label {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.age-container {
  display: flex;
  align-items: center;
  gap: 4px;

  .el-input {
    width: 60px;
  }

  .age-unit {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

/* 证件号码行 */
.idcode-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .card-text {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 180px;
    font-family: 'Consolas', monospace;
  }
}

/* 折叠切换条 */
.collapse-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  transition: background 0.2s;

  i:first-child {
    color: var(--text-secondary);
    font-size: 14px;
  }

  &:hover {
    background: var(--bg-secondary);
  }
}

/* 证件照预览区 */
.card-preview-section {
  .card-preview-body {
    padding: 16px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 0 0 10px 10px;
  }
}

.card-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

/* 证件照片 — 保持原有精确定位逻辑 */
.idcard-box {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;

  .idcard-image-item {
    width: 540px;
    height: 340px;
    position: relative;
    border: 1px solid var(--border-light);
    border-radius: 18px;
    overflow: hidden;
    margin-right: 20px;
    margin-bottom: 20px;
    flex-shrink: 0;

    &.yjz {
      border: none;
    }

    ::after {
      content: " ";
      position: absolute;
      width: 100%;
      height: 100%;
      background: url(../../assets/icard/watermark.png) repeat;
      top: 0;
      left: 0;
    }

    .idcard-bg {
      width: 100%;
    }

    .avatar {
      position: absolute;
      top: 30px;
      right: 23px;
      width: 170px;
      height: 200px;
      object-fit: cover;
    }

    .txt-content.sfz {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;

      .txt {
        position: absolute;
        font-family: 'fzhei';
      }

      .txt-name { left: 95px; top: 61px; }
      .txt-sex { left: 95px; top: 100px; }
      .txt-nation { left: 216px; top: 101px; }
      .txt-year { left: 94px; top: 139px; }
      .txt-month { left: 185px; top: 140px; }
      .txt-day { left: 238px; top: 140px; }
      .txt-address { left: 97px; top: 179px; }
      .txt-idCode { left: 153px; top: 283px; }
      .txt-signPart { left: 208px; top: 245px; }
      .txt-validPeriod { left: 208px; top: 286px; }
    }

    .txt-content.yjz {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;

      .txt {
        position: absolute;
        font-family: 'fzhei';
        font-size: 18px;
      }

      .txt-name-pinyin { left: 47px; top: 70px; }
      .txt-name-hanzi { left: 47px; top: 95px; }
      .txt-sex { left: 47px; top: 153px; }
      .txt-birth { left: 167px; top: 153px; }
      .txt-nation { left: 47px; top: 204px; }
      .txt-validPeriod { left: 47px; top: 253px; }
      .txt-idCode {
        left: 153px;
        top: 283px;
        font-size: 20px;
        letter-spacing: 2px;
      }
    }
  }
}

/* 历史记录 */
.history-section {
  .history-list {
    max-height: 200px;
    overflow: auto;
    padding: 0 4px;
  }
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--bg-tertiary);
  }

  .history-id {
    font-size: 13px;
    font-weight: 600;
    font-family: 'Consolas', monospace;
    color: var(--text-primary);
    flex: 1;
  }

  .history-meta {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .history-copy {
    color: var(--text-placeholder);
    font-size: 14px;

    &:hover {
      color: #409eff;
    }
  }
}

/* 移动端单列 */
@media (max-width: 540px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
