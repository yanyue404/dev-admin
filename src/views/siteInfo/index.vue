<template>
  <div class="dashboard-container">
    <el-alert title="网站信息分析" type="info" show-icon :closable="false" description="输入网站 URL 或 JS/CSS 文件地址，分析部署时间、服务器信息、缓存策略等"></el-alert>
    <br />

    <el-card class="box-card">
      <!-- 输入区 -->
      <div class="input-section">
        <el-input
          v-model="url"
          placeholder="输入 URL，如 https://cdn.example.com 或 https://cdn.example.com/app.js"
          size="medium"
          clearable
          @keyup.enter.native="analyze"
        >
          <el-button slot="append" @click="analyze" :loading="loading" icon="el-icon-search">分析</el-button>
        </el-input>
        <div class="quick-links">
          <span class="label">快速测试：</span>
          <el-tag v-for="link in quickLinks" :key="link.url" size="small" @click="url = link.url" class="quick-tag">{{ link.label }}</el-tag>
        </div>
      </div>

      <!-- 结果区 -->
      <div v-if="result" class="result-section">
        <!-- 概览卡片 -->
        <div class="overview-cards">
          <div class="info-card deploy-card" :class="result.deployTime ? 'has-deploy' : 'no-deploy'">
            <div class="card-icon"><i class="el-icon-time"></i></div>
            <div class="card-content">
              <div class="card-label">部署/更新时间</div>
              <div class="card-value">{{ result.deployTime || '未知' }}</div>
              <div class="card-sub" v-if="result.deployAge">距今 {{ result.deployAge }}</div>
            </div>
          </div>
          <div class="info-card">
            <div class="card-icon"><i class="el-icon-monitor"></i></div>
            <div class="card-content">
              <div class="card-label">服务器</div>
              <div class="card-value">{{ result.server || '未披露' }}</div>
              <div class="card-sub" v-if="result.poweredBy">Powered: {{ result.poweredBy }}</div>
            </div>
          </div>
          <div class="info-card">
            <div class="card-icon"><i class="el-icon-connection"></i></div>
            <div class="card-content">
              <div class="card-label">协议</div>
              <div class="card-value">{{ result.protocol }}</div>
              <div class="card-sub" v-if="result.isHttps"><i class="el-icon-lock" style="color:#67c23a"></i> HTTPS 安全连接</div>
              <div class="card-sub" v-else><i class="el-icon-unlock" style="color:#f56c6c"></i> HTTP 不安全</div>
            </div>
          </div>
          <div class="info-card">
            <div class="card-icon"><i class="el-icon-document"></i></div>
            <div class="card-content">
              <div class="card-label">资源信息</div>
              <div class="card-value">{{ result.contentType || '未知类型' }}</div>
              <div class="card-sub" v-if="result.contentLength">{{ result.contentLength }}</div>
            </div>
          </div>
          <div class="info-card" v-if="result.cdnProvider">
            <div class="card-icon"><i class="el-icon-share"></i></div>
            <div class="card-content">
              <div class="card-label">CDN</div>
              <div class="card-value">{{ result.cdnProvider }}</div>
              <div class="card-sub" v-if="result.cacheStatus">Cache: {{ result.cacheStatus }}</div>
            </div>
          </div>
        </div>

        <!-- 缓存策略 -->
        <el-collapse v-model="activeCollapse">
          <el-collapse-item title="缓存策略" name="cache">
            <div class="detail-grid">
              <div class="detail-row" v-for="item in result.cacheInfo" :key="item.key">
                <span class="detail-key">{{ item.key }}</span>
                <span class="detail-val" :class="item.highlight">{{ item.value }}</span>
              </div>
            </div>
          </el-collapse-item>

          <el-collapse-item title="完整响应头" name="headers">
            <div class="detail-grid">
              <div class="detail-row" v-for="item in result.headers" :key="item.key">
                <span class="detail-key">{{ item.key }}</span>
                <span class="detail-val">{{ item.value }}</span>
              </div>
            </div>
          </el-collapse-item>

          <el-collapse-item title="安全相关" name="security">
            <div class="detail-grid">
              <div class="detail-row" v-for="item in result.securityInfo" :key="item.key">
                <span class="detail-key">{{ item.key }}</span>
                <span class="detail-val" :class="item.highlight">{{ item.value }}</span>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-section">
        <el-alert :title="errorMsg" type="error" show-icon :closable="false">
          <template slot="default">
            <p>常见原因：</p>
            <ul>
              <li>目标服务器不允许跨域请求（CORS 限制）</li>
              <li>URL 格式不正确</li>
              <li>目标服务器无法访问</li>
            </ul>
            <p style="margin-top:8px">建议：尝试输入 JS/CSS 等静态资源 URL，静态文件通常允许跨域访问。</p>
          </template>
        </el-alert>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'SiteInfo',
  data() {
    return {
      url: '',
      loading: false,
      result: null,
      errorMsg: '',
      activeCollapse: ['cache'],
      quickLinks: [
        { label: 'jQuery CDN', url: 'https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js' },
        { label: 'Vue CDN', url: 'https://cdn.jsdelivr.net/npm/vue@2/dist/vue.min.js' },
        { label: 'React CDN', url: 'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js' },
        { label: 'Bootstrap CSS', url: 'https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css' }
      ]
    }
  },
  methods: {
    async analyze() {
      if (!this.url.trim()) {
        this.$message.warning('请输入 URL');
        return;
      }

      let targetUrl = this.url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
        this.url = targetUrl;
      }

      this.loading = true;
      this.result = null;
      this.errorMsg = '';

      try {
        const info = await this.fetchSiteInfo(targetUrl);
        if (info) {
          this.result = info;
          this.$message.success('分析完成');
        }
      } catch (err) {
        try {
          const partialInfo = await this.fetchSiteInfoNoCors(targetUrl);
          if (partialInfo) {
            this.result = partialInfo;
            this.$message.warning('部分信息受限，仅展示可获取的内容');
          } else {
            this.errorMsg = '无法获取目标网站信息';
          }
        } catch (e2) {
          this.errorMsg = '无法获取目标网站信息：' + (err.message || '网络错误');
        }
      } finally {
        this.loading = false;
      }
    },

    async fetchSiteInfo(url) {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow'
      });

      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return this.parseHeaders(headers, url, response.type);
    },

    async fetchSiteInfoNoCors(url) {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        redirect: 'follow'
      });

      if (response.type === 'opaque') {
        return this.parseHeaders({}, url, 'opaque');
      }

      return null;
    },

    parseHeaders(headers, url, responseType) {
      const result = {
        deployTime: '',
        deployAge: '',
        server: '',
        poweredBy: '',
        protocol: '',
        isHttps: url.startsWith('https://'),
        contentType: '',
        contentLength: '',
        cdnProvider: '',
        cacheStatus: '',
        cacheInfo: [],
        headers: [],
        securityInfo: []
      };

      result.protocol = result.isHttps ? 'HTTPS' : 'HTTP';

      const lastModified = headers['last-modified'];
      const dateHeader = headers['date'];
      const eTag = headers['etag'];

      if (lastModified) {
        try {
          const lmDate = new Date(lastModified);
          result.deployTime = this.formatDate(lmDate);
          result.deployAge = this.calcAge(lmDate);
        } catch (e) {
          result.deployTime = lastModified;
        }
      } else if (eTag && eTag.includes('-')) {
        result.deployTime = '由 ETag 标识: ' + eTag;
      } else if (dateHeader) {
        try {
          const dDate = new Date(dateHeader);
          result.deployTime = this.formatDate(dDate) + ' (响应时间)';
          result.deployAge = this.calcAge(dDate);
        } catch (e) {
          result.deployTime = dateHeader + ' (响应时间)';
        }
      }

      result.server = headers['server'] || '';
      result.poweredBy = headers['x-powered-by'] || '';

      result.contentType = headers['content-type'] || '';
      const cl = headers['content-length'];
      if (cl) {
        const bytes = parseInt(cl);
        result.contentLength = bytes >= 1024 * 1024
          ? (bytes / 1024 / 1024).toFixed(2) + ' MB'
          : bytes >= 1024
            ? (bytes / 1024).toFixed(1) + ' KB'
            : bytes + ' B';
      }

      const cdnHeaders = ['x-cdn-provider', 'x-cache-cdn', 'x-edge-location', 'x-cdn-origin',
        'x-akamai-transformed', 'x-fastly-request-id', 'cf-ray', 'x-amz-cf-id',
        'x-sucuri-id', 'x-cdn'];
      for (const h of cdnHeaders) {
        if (headers[h]) {
          result.cdnProvider = this.detectCDN(h, headers[h]);
          break;
        }
      }
      if (!result.cdnProvider && result.server) {
        if (result.server.includes('Cloudflare')) result.cdnProvider = 'Cloudflare';
        else if (result.server.includes('AkamaiGHost')) result.cdnProvider = 'Akamai';
        else if (result.server.includes('Varnish')) result.cdnProvider = 'Varnish';
        else if (result.server.includes('AmazonS3')) result.cdnProvider = 'AWS S3/CloudFront';
        else if (result.server.includes('nginx')) result.cdnProvider = '';
      }

      result.cacheStatus = headers['x-cache'] || headers['x-cache-status'] || headers['cf-cache-status'] || '';

      const cacheKeys = ['cache-control', 'expires', 'age', 'etag', 'last-modified', 'x-cache',
        'x-cache-status', 'cf-cache-status', 'vary', 'pragma'];
      for (const key of cacheKeys) {
        if (headers[key]) {
          let highlight = '';
          if (key === 'cache-control') {
            if (headers[key].includes('no-cache') || headers[key].includes('no-store')) highlight = 'warn';
            else if (headers[key].includes('max-age')) highlight = 'success';
          }
          result.cacheInfo.push({ key, value: headers[key], highlight });
        }
      }

      const securityKeys = ['strict-transport-security', 'x-content-type-options', 'x-frame-options',
        'x-xss-protection', 'content-security-policy', 'referrer-policy',
        'permissions-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy',
        'access-control-allow-origin', 'access-control-allow-methods'];
      for (const key of securityKeys) {
        if (headers[key]) {
          let highlight = 'success';
          if (key === 'x-frame-options' && headers[key] === 'ALLOWALL') highlight = 'warn';
          if (key === 'access-control-allow-origin' && headers[key] === '*') highlight = 'warn';
          result.securityInfo.push({ key, value: headers[key], highlight });
        }
      }

      if (result.securityInfo.length === 0) {
        result.securityInfo.push({ key: '安全响应头', value: '未检测到安全相关响应头', highlight: 'warn' });
      }

      for (const [key, value] of Object.entries(headers)) {
        result.headers.push({ key, value });
      }

      if (responseType === 'opaque') {
        result.deployTime = '受限（opaque 响应）';
        result.server = '受限（opaque 响应）';
        result.contentType = '受限（opaque 响应）';
        result.headers = [{ key: '备注', value: '目标服务器不允许跨域读取响应头，仅能确认 URL 可达' }];
        result.cacheInfo = [{ key: '备注', value: 'CORS 限制，无法读取缓存相关头' }];
      }

      return result;
    },

    detectCDN(headerName, value) {
      if (headerName === 'cf-ray' || headerName === 'cf-cache-status') return 'Cloudflare';
      if (headerName === 'x-amz-cf-id') return 'AWS CloudFront';
      if (headerName === 'x-akamai-transformed') return 'Akamai';
      if (headerName === 'x-fastly-request-id') return 'Fastly';
      if (headerName === 'x-sucuri-id') return 'Sucuri';
      if (value.includes('cloudflare')) return 'Cloudflare';
      if (value.includes('akamai')) return 'Akamai';
      if (value.includes('fastly')) return 'Fastly';
      if (value.includes('cdn')) return value;
      return value;
    },

    formatDate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const s = String(date.getSeconds()).padStart(2, '0');
      return `${y}-${m}-${d} ${h}:${min}:${s}`;
    },

    calcAge(date) {
      const now = new Date();
      const diffMs = now - date;
      if (diffMs < 0) return '刚刚';

      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMs / 3600000);
      const diffDay = Math.floor(diffMs / 86400000);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);

      if (diffMin < 1) return '几秒前';
      if (diffMin < 60) return diffMin + ' 分钟前';
      if (diffHour < 24) return diffHour + ' 小时前';
      if (diffDay < 30) return diffDay + ' 天前';
      if (diffMonth < 12) return diffMonth + ' 个月前';
      return diffYear + ' 年前';
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  margin: 30px;
}

.input-section {
  margin-bottom: 20px;

  .quick-links {
    margin-top: 10px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;

    .label {
      color: var(--text-secondary);
      font-size: 13px;
    }

    .quick-tag {
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        color: #409eff;
        border-color: #409eff;
      }
    }
  }
}

.result-section {
  margin-top: 20px;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.info-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border-color: var(--border-color);
  }

  .card-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .card-content {
    min-width: 0;

    .card-label {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      word-break: break-all;
    }

    .card-sub {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
    }
  }

  &.has-deploy {
    border-color: #67c23a;
    background: linear-gradient(135deg, #f0f9eb 0%, var(--card-bg) 50%);

    .card-icon {
      background: #67c23a;
      color: #fff;
    }
  }

  &.no-deploy {
    .card-icon {
      background: #f56c6c;
      color: #fff;
    }
  }
}

.detail-grid {
  .detail-row {
    display: flex;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-lighter);
    align-items: baseline;

    .detail-key {
      width: 180px;
      font-weight: 500;
      color: var(--text-regular);
      font-size: 13px;
      flex-shrink: 0;
    }

    .detail-val {
      flex: 1;
      color: var(--text-primary);
      font-size: 13px;
      word-break: break-all;
      font-family: 'Courier New', monospace;

      &.success { color: #67c23a; }
      &.warn { color: #e6a23c; }
    }
  }
}

.error-section {
  margin-top: 20px;

  ul {
    margin: 4px 0;
    padding-left: 20px;
    li { font-size: 13px; color: var(--text-regular); }
  }
}
</style>
