# Node.js Proxmox Dashboard Dockerfile
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションのソースをコピー
COPY . .

# ポート3000を公開
EXPOSE 3000

# 非特権ユーザーを作成して使用
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const req = http.request('http://localhost:3000/health', (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# アプリケーションを起動
CMD ["node", "app.js"]
