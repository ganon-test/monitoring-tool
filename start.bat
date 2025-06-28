@echo off
echo 🚀 Proxmox監視システム起動スクリプト
echo ==================================

REM 仮想環境の確認
if not exist "venv" (
    echo 📦 仮想環境を作成中...
    python -m venv venv
)

REM 仮想環境をアクティベート
echo 🔧 仮想環境をアクティベート中...
call venv\Scripts\activate.bat

REM 依存関係のインストール
echo 📚 依存関係をインストール中...
pip install -r requirements_clean.txt

REM データベースディレクトリの作成
if not exist "data" mkdir data

echo ✅ セットアップ完了！
echo.
echo 🌐 起動コマンド: python server.py
echo 📊 ダッシュボード: http://localhost:5000
echo 🔗 ステータスAPI: http://localhost:5000/api/status
echo 📈 履歴API: http://localhost:5000/api/history
echo.

REM サーバー起動
echo 🚀 サーバーを起動中...
python server.py

pause
