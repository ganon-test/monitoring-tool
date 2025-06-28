# Proxmox監視ダッシュボード

ProxmoxクラスターとNextcloudインスタンスを監視するモダンなWebダッシュボードです。Node.jsで構築され、リアルタイムデータ更新と美しいUIを提供します。

## 🌟 機能

- **リアルタイム監視**: WebSocketを使用したライブデータ更新
- **Proxmox API統合**: 直接Proxmox APIからデータを取得
- **クラスター対応**: 複数のProxmoxホストからデータを収集・統合
- **重複排除**: ノード・VM情報の自動重複排除
- **統合UI**: クラスター概要とノード詳細を一体化したレイアウト
- **モダンUI**: Chart.js、レスポンシブデザイン、ダークテーマ
- **履歴データ**: SQLiteによるデータ保存と履歴表示
- **設定管理**: YAML設定ファイルと環境変数サポート
- **複数デプロイメント**: Docker、Docker Compose、Kubernetes対応

## 📊 監視項目

### Proxmoxクラスター
- 平均CPU使用率（アクティブノード）
- 総メモリ使用率（アクティブノード合計）
- ノード状態（アクティブ/総数）
- 仮想マシン/コンテナ状態（稼働/総数）
- 各ノードの詳細リソース情報
- クラスター接続状況

### Nextcloud
- ステータス監視
- ユーザー統計
- ストレージ使用量

## 🚀 クイックスタート

### 前提条件
- Node.js 18以上
- Proxmoxクラスターへのアクセス
- Nextcloudインスタンス（オプション）

### インストール

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd monitoring-api
```

2. Node.jsダッシュボードディレクトリに移動:
```bash
cd nodejs-dashboard
```

3. 依存関係をインストール:
```bash
npm install
```

4. 設定ファイルをコピーして編集:
```bash
cp ../config.yaml.example ../config.yaml
cp .env.example .env
```

5. 設定ファイルを編集:
- `../config.yaml`: Proxmox/Nextcloudの接続情報
- `.env`: 機密情報（パスワードなど）

6. アプリケーションを起動:
```bash
npm start
# または開発モード
npm run dev
```

7. ブラウザでアクセス:
```
http://localhost:3000
```

## 📁 プロジェクト構造

```
monitoring-api/
├── config.yaml              # メイン設定ファイル
├── docker-compose.yml       # Docker Compose設定
├── k8s-deployment.yaml      # Kubernetes設定
├── .github/workflows/       # CI/CD設定
│   └── deploy.yaml
└── nodejs-dashboard/        # メインアプリケーション
    ├── app.js              # Express/Socket.IOサーバー
    ├── package.json        # Node.js依存関係
    ├── Dockerfile          # Dockerイメージ
    ├── public/             # フロントエンドファイル
    │   ├── index.html      # メインダッシュボード
    │   ├── style.css       # スタイル
    │   └── dashboard.js    # フロントエンドロジック
    └── README.md           # 詳細ドキュメント
```

## 🐳 Dockerデプロイメント

### Docker Compose
```bash
# 環境変数を設定
cp .env.example .env
# .envを編集

# 起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

### 単体Dockerコンテナ
```bash
# イメージをビルド
cd nodejs-dashboard
docker build -t proxmox-dashboard .

# 実行
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/../config.yaml:/app/config.yaml:ro \
  -e NEXTCLOUD_PASSWORD=your_password \
  -e PROXMOX_PASSWORD_1=your_password \
  -e PROXMOX_PASSWORD_2=your_password \
  proxmox-dashboard
```

## ☸️ Kubernetesデプロイメント

```bash
# 設定とシークレットを更新
kubectl apply -f k8s-deployment.yaml

# ポッドの状態を確認
kubectl get pods -l app=proxmox-dashboard

# ログを確認
kubectl logs -l app=proxmox-dashboard -f
```

## ⚙️ 設定

### config.yaml
```yaml
proxmox:
  hosts:
    - host: "proxmox1.local"
      username: "root@pam"
      port: 8006
    - host: "proxmox2.local"  
      username: "root@pam"
      port: 8006

nextcloud:
  url: "https://nextcloud.local"
  username: "admin"

monitoring:
  interval: 30
  history_retention_days: 7
```

### 環境変数
```bash
NEXTCLOUD_PASSWORD=your_nextcloud_password
PROXMOX_PASSWORD_1=your_proxmox_password_1
PROXMOX_PASSWORD_2=your_proxmox_password_2
PORT=3000
NODE_ENV=production
```

## 🔧 API エンドポイント

- `GET /` - メインダッシュボード
- `GET /health` - ヘルスチェック
- `GET /api/status` - 現在のステータス
- `GET /api/history` - 履歴データ
- `WebSocket` - リアルタイムデータ更新

## 🔄 アップグレード

### 従来のPythonシステムから移行
このバージョンはPythonバックエンドを完全に置き換えます：

1. Node.jsダッシュボードをセットアップ
2. 設定を移行（config.yaml）
3. 新しいデプロイメント設定を使用
4. 従来のPythonサービスを停止

### 自動デプロイメント
GitHub Actionsにより、`main`ブランチへのプッシュで自動デプロイされます。

## 🐛 トラブルシューティング

### よくある問題

1. **SSL証明書エラー**
   - Proxmoxで自己署名証明書を使用している場合は正常です
   - アプリケーションはSSL検証をスキップします

2. **接続エラー**
   - Proxmoxホストとポートを確認
   - ネットワーク接続を確認
   - 認証情報を確認

3. **パフォーマンス**
   - 監視間隔を調整（config.yaml）
   - 履歴保持期間を調整

### ログの確認
```bash
# Docker Compose
docker-compose logs -f

# Kubernetes
kubectl logs -l app=proxmox-dashboard -f

# 直接実行
npm start
```

## 🤝 コントリビューション

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/new-feature`)
3. 変更をコミット (`git commit -am 'Add new feature'`)
4. ブランチにプッシュ (`git push origin feature/new-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License

## 🔗 関連リンク

- [Proxmox API Documentation](https://pve.proxmox.com/wiki/Proxmox_VE_API)
- [Node.js Documentation](https://nodejs.org/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Socket.IO Documentation](https://socket.io/)
