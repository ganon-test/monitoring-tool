# Proxmox監視ダッシュボード (Node.js版)

ProxmoxクラスターをリアルタイムでモニタリングするためのWebダッシュボードです。  
Node.jsでProxmox APIから直接データを取得し、Socket.IOを使用してリアルタイム更新を提供します。

## 特徴

- 🚀 **リアルタイム監視**: Socket.IOによるライブデータ更新
- 📊 **可視化**: Chart.jsを使用した美しいグラフとチャート
- 🎨 **モダンUI**: レスポンシブでダークテーマの美しいインターフェース
- 🔒 **セキュリティ**: 環境変数での機密情報管理
- 📱 **レスポンシブ**: モバイルデバイス対応
- 🏗️ **拡張可能**: モジュール化されたアーキテクチャ

## 監視項目

### ノード情報
- CPU使用率
- メモリ使用率
- オンライン/オフライン状態
- アップタイム

### 仮想マシン・コンテナ
- 稼働状態（実行中/停止中）
- リソース使用量
- VM/CTの一覧表示

### 履歴データ
- CPU使用率の推移グラフ
- メモリ使用率の推移グラフ
- 1時間〜24時間の時間範囲選択

## システム要件

- Node.js 16.0以上
- Proxmox VE 6.0以上
- 対応ブラウザ: Chrome, Firefox, Safari, Edge

## インストール

### 1. プロジェクトのセットアップ

```bash
cd nodejs-dashboard
npm install
```

### 2. 設定ファイルの準備

```bash
# 環境変数ファイルをコピー
cp .env.example .env

# 環境変数ファイルを編集（お好みで）
notepad .env
```

### 3. config.yamlの設定

プロジェクトルートの`config.yaml`でProxmoxサーバーの接続情報を設定します：

```yaml
proxmox:
  - host: "192.168.0.102"
    username: "root@pam"
    password: "your_password"
    verify_ssl: false
  - host: "192.168.0.101"
    username: "root@pam"
    password: "your_password"
    verify_ssl: false
```

### 4. 起動

```bash
# 開発モード（nodemonで自動再起動）
npm run dev

# 本番モード
npm start
```

### 5. アクセス

ブラウザで以下のURLにアクセス：
- ダッシュボード: http://localhost:3000
- ステータスAPI: http://localhost:3000/api/status
- 履歴API: http://localhost:3000/api/history

## 設定オプション

### 環境変数

| 変数名 | デフォルト | 説明 |
|--------|------------|------|
| `PORT` | 3000 | Webサーバーのポート番号 |
| `CONFIG_PATH` | ../config.yaml | 設定ファイルのパス |
| `DB_PATH` | ./monitoring.db | SQLiteデータベースのパス |
| `MONITOR_INTERVAL` | 30000 | 監視間隔（ミリ秒） |
| `HISTORY_RETENTION_DAYS` | 7 | 履歴データ保持期間（日） |

### Proxmox接続設定（環境変数での上書き）

```bash
# Proxmoxサーバー1
PROXMOX_HOST_1=192.168.0.102
PROXMOX_USERNAME_1=root@pam
PROXMOX_PASSWORD_1=your_password
PROXMOX_VERIFY_SSL_1=false

# Proxmoxサーバー2
PROXMOX_HOST_2=192.168.0.101
PROXMOX_USERNAME_2=root@pam
PROXMOX_PASSWORD_2=your_password
PROXMOX_VERIFY_SSL_2=false
```

## API仕様

### GET /api/status
現在のシステム状態を取得

```json
{
  "success": true,
  "data": {
    "nodes": [...],
    "vms": [...],
    "containers": [...]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### GET /api/history
履歴データを取得

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-01T12:00:00.000Z",
      "avg_cpu": 45.2,
      "avg_memory": 62.8
    }
  ]
}
```

### WebSocket Events

- **connection**: クライアント接続時
- **data_update**: リアルタイムデータ更新時
- **disconnect**: クライアント切断時

## 開発

### プロジェクト構造

```
nodejs-dashboard/
├── app.js              # メインサーバーファイル
├── package.json              # プロジェクト設定
├── .env.example             # 環境変数テンプレート
├── public/                  # フロントエンドファイル
│   ├── index.html           # メインHTML
│   ├── style.css            # スタイルシート
│   ├── dashboard-main.js    # メインダッシュボードロジック
│   ├── node-manager.js      # ノード管理クラス
│   ├── vm-manager.js        # VM/コンテナ管理クラス
│   ├── chart-manager.js     # チャート管理クラス
│   ├── utils.js             # ユーティリティ関数
│   └── favicon.svg          # ファビコン
└── monitoring.db            # SQLiteデータベース（自動生成）
```

### デバッグ

開発時は以下のコマンドでデバッグ情報を有効にできます：

```bash
# デバッグモード
DEBUG=* npm run dev

# ログレベル設定
LOG_LEVEL=debug npm start
```

## トラブルシューティング

### よくある問題

1. **Proxmoxに接続できない**
   - `config.yaml`の接続情報を確認
   - ネットワーク接続を確認
   - ファイアウォール設定を確認

2. **SSL証明書エラー**
   - `verify_ssl: false`に設定
   - または適切な証明書を設定

3. **データが表示されない**
   - ブラウザの開発者ツールでエラーを確認
   - サーバーログを確認

### ログの確認

```bash
# サーバーログをリアルタイム表示
npm start

# データベースの内容確認
sqlite3 monitoring.db "SELECT * FROM metrics ORDER BY timestamp DESC LIMIT 10;"
```

## ライセンス

MIT License

## 貢献

バグレポートや機能要望は、GitHubのIssuesまでお願いします。

## サポート

- 📧 Email: support@example.com
- 📖 Documentation: [GitHub Wiki](https://github.com/your-repo/wiki)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/your-repo/issues)
