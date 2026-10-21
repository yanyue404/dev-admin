<template>
  <div class="click-area-wrap">
    <el-alert title="获取图片点击区域工具（支持多区域）" type="info" show-icon>
    </el-alert>
    <div class="inner">
      <!-- 图片地址录入 -->
      <el-form :model="baseForm" ref="baseForm" label-width="150px" class="base-form">
        <el-form-item label="设置图片地址:">
          <el-input v-model="baseForm.src"></el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="openImageAreaDraw">设置图片点击区域地址</el-button>
          <el-button @click="onReset('baseForm')">重置</el-button>
        </el-form-item>
        <!-- <el-form-item label="结果:" prop="result">
          <el-input type="textarea" v-model="baseForm.result" :disabled="true"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="onTapCopy('baseForm')" type="success">复制结果</el-button>
        </el-form-item> -->
      </el-form>
      <!-- 图片区域地址 -->
      <el-table :data="coordinateList" stripe style="width: 100%">
        <el-table-column prop="sortNo" label="序号">
        </el-table-column>
        <el-table-column prop="areaText" label="坐标">
        </el-table-column>
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button type="text" @click="handleDeleteCoordinate(scope.row)">删除</el-button>
            <el-button type="text" @click="handleCopyCoordinate(scope.row)">复制</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>


    <el-dialog class="e-c-image-area-draw" @close="close" width="790px" :append-to-body="true" :visible.sync="show"
      title="请绘制点击区域">
      <div class="wrap">
        <img :src="baseForm.src" alt />
        <div class="image-mask" @mousedown="mousedown" @mousemove="mousemove" @mouseup="mouseup"></div>
        <div class="area">
          <span class="area-item flex-c-c active" key="new" :style="{
            left: area[0] + 'px',
            top: area[1] + 'px',
            width: area[2] + 'px',
            height: area[3] + 'px',
            background: `rgba(0, 0,0, 0.6)`,
          }">{{ activeIndex }}</span>
          <span class="area-item flex-c-c" v-for="(item, index) in clickArea" :key="index" :style="{
            left: item.area[0] + 'px',
            top: item.area[1] + 'px',
            width: item.area[2] + 'px',
            height: item.area[3] + 'px',
            background: `rgba(0, 0,0, 0.6)`,
          }">{{ index }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>
<script>
import { saveTextToClipBoard } from "@/utils/dom";
export default {
  data() {
    return {
      baseForm: {
        src: "",
        result: "",
      },
      clickArea: [],
      activeIndex: 0,
      show: false,
      area: [],
    };
  },
  computed: {
    coordinateList() {
      return this.clickArea.map((item, index) => {
        return {
          index,
          sortNo: index + 1,
          areaText: JSON.stringify(item.area)
        }
      })
    }
  },
  watch: {
    show(v) {
      if (v) {
        this.$nextTick().then(() => {
          if (this.clickArea.length > 0) {
            this.area = this.clickArea[this.activeIndex].area;
          }
        });
      }
    },
  },
  methods: {
    openImageAreaDraw() {
      this.show = true;
    },
    onReset(formName) {
      this.$refs[formName].resetFields();
      this[formName].src = "";
      this[formName].result = "";
    },
    onTapCopy(formName) {
      saveTextToClipBoard(this[formName].result);
      this.$message({
        message: "复制成功！",
        type: "success",
      });
    },
    close(e) {
      this.baseForm.result = JSON.stringify(this.area);
    },
    mousedown(e) {
      let { offsetX, offsetY } = e;
      this.isWork = true;
      this.area = [offsetX, offsetY, 0, 0];
    },
    mousemove(e) {
      if (!this.isWork) return;
      let { offsetX, offsetY } = e;
      let [x, y] = this.area;
      this.area = [x, y, offsetX - x, offsetY - y];
      console.log(this.area);
    },
    mouseup(e) {
      this.isWork = false;
      this.clickArea.push({ area: [...this.area] })
    },
    handleDeleteCoordinate(info) {
      this.clickArea.splice(info.index, 1);
    },
    handleCopyCoordinate(info) {
      saveTextToClipBoard(info.areaText);
      this.$message({
        message: "复制成功！",
        type: "success",
      });
    }
  },
};
</script>
<style lang="scss">
.inner{
  padding: 30px;
}

.e-c-image-area-draw {
  .el-dialog__body {
    background: #e7e7e7;
  }

  .wrap {
    position: relative;
  }

  img {
    width: auto;
  }

  .image-mask {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    cursor: crosshair;
    z-index: 2;
  }

  .area-item {
    position: absolute;
    color: #fff;

    &.active {
      opacity: 0.5;
    }
  }
}
</style>
