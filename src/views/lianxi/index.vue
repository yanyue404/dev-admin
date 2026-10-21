<template>
  <div class="lianxi-container">
    <el-card class="box-card">
      <!-- 模式选择 -->
      <div v-if="!currentMode" class="mode-selection">
        <h2 class="section-title">选择刷题模式</h2>
        <div class="button-group">
          <el-button type="warning" size="medium" @click="setMode('all')">按顺序刷题</el-button>
          <el-button type="success" size="medium" @click="setMode('type')">按类型刷题</el-button>
          <el-button type="primary" size="medium" @click="setMode('random')">随机刷题</el-button>
        </div>
      </div>

      <!-- 类型选择 (如果模式是 'type') -->
      <div v-if="currentMode === 'type' && !currentType" class="type-selection">
        <h2 class="section-title">选择题目类型</h2>
        <div class="button-group">
          <el-button type="primary" size="medium" @click="setType('single')">单选题</el-button>
          <el-button type="primary" size="medium" @click="setType('multiple')">多选题</el-button>
          <el-button type="warning" size="medium" @click="setType('true_false')">判断题</el-button>
        </div>
        <div class="back-button">
          <el-button size="small" @click="resetModeSelection">返回模式选择</el-button>
        </div>
      </div>
      
      <!-- 题目显示区域 -->
      <div v-if="currentQuestion" class="question-container">
        <div class="question-header">
          <h2 class="question-title">
            {{ currentIndex + 1 }}. {{ currentQuestion.question }}
          </h2>
          <el-tag :type="getQuestionTypeTag(currentQuestion.type)" size="small">
            {{ getQuestionTypeText(currentQuestion.type) }}
          </el-tag>
        </div>
        
        <div class="options-container">
          <el-radio-group 
            v-if="currentQuestion.type === 'single' || currentQuestion.type === 'true_false'"
            v-model="userAnswer"
            :disabled="result"
            class="options-radio-group"
          >
            <el-radio 
              v-for="(option, key) in currentQuestion.options" 
              :key="key"
              :label="key"
              class="option-item"
            >
              {{ key }}: {{ option }}
            </el-radio>
          </el-radio-group>
          
          <el-checkbox-group 
            v-else-if="currentQuestion.type === 'multiple'"
            v-model="userAnswers"
            :disabled="result"
            class="options-checkbox-group"
          >
            <el-checkbox 
              v-for="(option, key) in currentQuestion.options" 
              :key="key"
              :label="key"
              class="option-item"
            >
              {{ key }}: {{ option }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
        
        <div class="submit-section">
          <el-button 
            v-if="!result"
            type="primary" 
            size="medium"
            @click="submitAnswer"
          >
            提交答案
          </el-button>
          
          <div v-if="result" class="result-message" :class="isCorrect ? 'result-correct' : 'result-error'">
            <p class="result-text">{{ resultMessage }}</p>
            <p v-if="!isCorrect" class="correct-answer">正确答案是：{{ correctAnswerText }}</p>
          </div>
        </div>

        <div v-if="result" class="action-buttons">
          <el-button 
            v-if="currentIndex < practiceQuestions.length - 1" 
            size="medium"
            @click="nextQuestion"
          >
            下一题
          </el-button>
          <el-button 
            type="danger" 
            size="medium"
            @click="finishPractice"
          >
            {{ currentIndex === practiceQuestions.length - 1 ? '完成练习' : '结束练习' }}
          </el-button>
        </div>
      </div>

      <!-- 题目加载完毕但未开始，或练习完成 -->
      <div v-if="!currentQuestion && currentMode && practiceQuestions.length === 0 && allQuestions.length > 0 && !isLoading" class="empty-state">
        <p class="empty-text">当前模式/类型下没有题目，或题目已刷完！</p>
        <el-button type="primary" @click="resetModeSelection">返回模式选择</el-button>
      </div>
      
      <div v-if="isLoading" class="loading-state">
        <i class="el-icon-loading"></i>
        <p class="loading-text">题目加载中...</p>
      </div>
      
      <div v-if="!isLoading && allQuestions.length === 0 && !fetchError" class="empty-state">
        <p class="empty-text error-text">题库为空或加载失败，请检查数据源。</p>
        <el-button type="primary" @click="loadQuestions">重新加载</el-button>
      </div>
      
      <div v-if="fetchError" class="error-state">
        <p class="error-text">加载题库失败: {{ fetchError }}</p>
        <el-button type="primary" @click="loadQuestions">重试</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'Lianxi',
  data() {
    return {
      allQuestions: [], // 存储从JSON加载的所有题目
      questions: [], // 当前练习的题目 (会被 practiceQuestions 填充)
      practiceQuestions: [], // 根据模式筛选或生成的题目
      currentIndex: 0,
      userAnswer: '', // 单选或判断题答案 (存储选项，如 'A', 'B')
      userAnswers: [], // 多选题答案 (存储选项数组，如 ['A', 'C'])
      result: false, // boolean: 是否已提交答案并显示结果
      isCorrect: false, // boolean: 答案是否正确
      resultMessage: '', // string: 显示的结果信息
      
      currentMode: null, // 'all', 'type', 'random'
      currentType: null, // 'single', 'multiple', 'true_false'
      
      isLoading: true, // 是否正在加载题目
      fetchError: null, // 加载错误信息

      QUESTION_COUNTS: { // 随机模式下各类型题目数量
        single: 20,
        multiple: 20,
        true_false: 20
      }
    }
  },
  computed: {
    currentQuestion() {
      if (this.practiceQuestions.length > 0 && this.currentIndex < this.practiceQuestions.length) {
        return this.practiceQuestions[this.currentIndex]
      }
      return null
    },
    correctAnswerText() {
      if (!this.currentQuestion) return ''
      if (this.currentQuestion.type === 'multiple') {
        // 确保答案是数组且已排序
        const ans = Array.isArray(this.currentQuestion.answer) 
          ? this.currentQuestion.answer 
          : [this.currentQuestion.answer]
        return ans.sort().join(', ')
      }
      return this.currentQuestion.answer
    }
  },
  methods: {
    loadQuestions() {
      this.isLoading = true
      this.fetchError = null
      try {
        // 从外部 URL 加载题库数据
        fetch('https://raw.githubusercontent.com/yanyue404/blog/refs/heads/master/assets/qaList.json')
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.json()
          })
          .then(data => {
            this.allQuestions = data
            if (this.allQuestions.length === 0) {
              console.warn("题库为空或者qaList.json格式不正确，期望得到一个数组。")
            }
            this.isLoading = false
          })
          .catch(error => {
            console.error('无法读取题库数据:', error)
            this.fetchError = error.message
            this.allQuestions = []
            this.isLoading = false
          })
      } catch (error) {
        console.error('无法读取题库数据:', error)
        this.fetchError = error.message
        this.allQuestions = []
        this.isLoading = false
      }
    },
    shuffleArray(array) {
      const arr = [...array]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    },
    getRandomSubset(array, count) {
      return this.shuffleArray(array).slice(0, count)
    },
    setMode(mode) {
      this.currentMode = mode
      this.currentType = null // 重置类型选择
      this.practiceQuestions = []
      this.currentIndex = 0
      this.resetAnswerState()
      if (mode === 'random') {
        this.generateRandomQuestions()
      }
      // 如果 mode === 'type', 等待用户选择具体类型
      if (mode === 'all') {
        this.generateQuestions() 
      }
    },
    setType(type) {
      this.currentType = type
      this.practiceQuestions = this.allQuestions.filter(q => q.type === type)
      if (this.practiceQuestions.length === 0) {
        this.$message.warning(`类型 "${type}" 下没有题目。`)
      }
      this.practiceQuestions = this.shuffleArray(this.practiceQuestions) // 类型刷题也打乱顺序
      this.currentIndex = 0
      this.resetAnswerState()
      this.questions = this.practiceQuestions // Legacy, for currentQuestion to work if not updated
    },
    generateRandomQuestions() {
      let tempQuestions = []
      const types = ['single', 'multiple', 'true_false']
      types.forEach(type => {
        const questionsOfType = this.allQuestions.filter(q => q.type === type)
        tempQuestions.push(...this.getRandomSubset(questionsOfType, this.QUESTION_COUNTS[type] || 20))
      })
      this.practiceQuestions = this.shuffleArray(tempQuestions)
      if (this.practiceQuestions.length === 0) {
        this.$message.warning("随机模式下未能生成题目，请检查题库数量和类型。")
      }
      this.currentIndex = 0
      this.resetAnswerState()
      this.questions = this.practiceQuestions // Legacy
    },
    generateQuestions() {
      let tempQuestions = []
      const types = ['single', 'multiple', 'true_false']
      types.forEach(type => {
        const questionsOfType = this.allQuestions.filter(q => q.type === type)
        tempQuestions.push(...questionsOfType)
      })
      this.practiceQuestions = tempQuestions
      this.questions = tempQuestions
      this.currentIndex = 0
      this.resetAnswerState()
    },
    resetAnswerState() {
      this.userAnswer = ''
      this.userAnswers = []
      this.result = false
      this.isCorrect = false
      this.resultMessage = ''
    },
    submitAnswer() {
      if (!this.currentQuestion) return
      
      const question = this.currentQuestion
      let correct = false

      if (question.type === 'single' || question.type === 'true_false') {
        // 确保 userAnswer 和 question.answer 都是字符串进行比较
        correct = String(this.userAnswer) === String(question.answer)
      } else if (question.type === 'multiple') {
        // 确保 userAnswer 和 question.answer 都是数组，排序后比较
        const userAnswerSorted = [...this.userAnswers].sort()
        const correctAnswerSorted = Array.isArray(question.answer) 
          ? [...question.answer].sort() 
          : [question.answer].sort()
        correct = JSON.stringify(userAnswerSorted) === JSON.stringify(correctAnswerSorted)
      }

      this.isCorrect = correct
      this.resultMessage = correct ? '回答正确！' : '回答错误！'
      this.result = true // 标记已提交，显示结果
    },
    nextQuestion() {
      if (this.currentIndex < this.practiceQuestions.length - 1) {
        this.currentIndex++
        this.resetAnswerState()
      } else {
        // 已经是最后一题了
        this.finishPractice(true) // true表示是自然完成
      }
    },
    finishPractice(isCompleted = false) {
      if (isCompleted) {
        this.$message.success("恭喜你，已完成当前练习！")
      } else {
        this.$message.info("练习已结束。")
      }
      this.resetModeSelection()
    },
    resetModeSelection() {
      this.currentMode = null
      this.currentType = null
      this.practiceQuestions = []
      this.currentIndex = 0
      this.resetAnswerState()
      this.questions = [] // Legacy
    },
    getQuestionTypeText(type) {
      const typeMap = {
        'single': '单选',
        'multiple': '多选',
        'true_false': '判断'
      }
      return typeMap[type] || type
    },
    getQuestionTypeTag(type) {
      const tagMap = {
        'single': 'primary',
        'multiple': 'success',
        'true_false': 'warning'
      }
      return tagMap[type] || ''
    }
  },
  mounted() {
    this.loadQuestions()
  }
}
</script>

<style scoped>
.lianxi-container {
  padding: 20px;
}

.box-card {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #303133;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.mode-selection,
.type-selection {
  padding: 30px;
  text-align: center;
}

.back-button {
  margin-top: 20px;
}

.question-container {
  padding: 20px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 15px;
}

.question-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1.6;
  flex: 1;
  margin: 0;
}

.options-container {
  margin: 20px 0;
}

.options-radio-group,
.options-checkbox-group {
  width: 100%;
}

.option-item {
  display: block;
  margin: 10px 0;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  transition: all 0.3s;
  cursor: pointer;
}

.option-item:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
}

.submit-section {
  margin: 20px 0;
}

.result-message {
  padding: 15px;
  border-radius: 4px;
  margin-top: 15px;
}

.result-correct {
  background-color: #f0f9ff;
  border: 1px solid #67c23a;
  color: #67c23a;
}

.result-error {
  background-color: #fef0f0;
  border: 1px solid #f56c6c;
  color: #f56c6c;
}

.result-text {
  font-weight: 600;
  font-size: 16px;
  margin: 0 0 8px 0;
}

.correct-answer {
  margin: 8px 0 0 0;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.empty-state,
.loading-state,
.error-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-text,
.loading-text,
.error-text {
  font-size: 16px;
  margin-bottom: 20px;
}

.error-text {
  color: #f56c6c;
}

.loading-state i {
  font-size: 24px;
  color: #409eff;
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
