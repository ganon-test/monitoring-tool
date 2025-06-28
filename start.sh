#!/bin/bash

echo "🚀 Proxmox監視システム起動スクリプト"
echo "=================================="

# 仮想環境の確認
if [ ! -d "venv" ]; then
    echo "📦 仮想環境を作成中..."
    python -m venv venv
fi

# 仮想環境をアクティベート
echo "🔧 仮想環境をアクティベート中..."
source venv/bin/activate

# 依存関係のインストール
echo "📚 依存関係をインストール中..."
pip install -r requirements_clean.txt

# データベースディレクトリの作成
mkdir -p data

echo "✅ セットアップ完了！"
echo ""
echo "🌐 起動コマンド: python server.py"
echo "📊 ダッシュボード: http://localhost:5000"
echo "🔗 ステータスAPI: http://localhost:5000/api/status"
echo "📈 履歴API: http://localhost:5000/api/history"
echo ""

# サーバー起動
echo "🚀 サーバーを起動中..."
python server.py
