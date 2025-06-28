/**
 * 新Proxmox監視ダッシュボード - 完全リビルド版
 * 旧システムを完全に削除し、シンプルで高性能な新システムに移行
 */

console.log('🔥 旧システム完全削除 - 新Proxmoxダッシュボードに移行してください');
console.log('🚀 新ダッシュボード: http://localhost:5000 (server.py使用)');
console.log('📝 起動方法: python server.py');

// リダイレクト処理
if (window.location.port !== '5000') {
    const newUrl = window.location.protocol + '//' + window.location.hostname + ':5000';
    console.log(`🔄 新システムにリダイレクト中: ${newUrl}`);
    
    // 3秒後にリダイレクト
    setTimeout(() => {
        window.location.href = newUrl;
    }, 3000);
    
    // ユーザーに通知
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-family: 'Segoe UI', sans-serif;
            text-align: center;
            padding: 20px;
        ">
            <div style="
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            ">
                <h1 style="font-size: 2.5em; margin-bottom: 20px;">🚀 システム移行</h1>
                <p style="font-size: 1.2em; margin-bottom: 30px; line-height: 1.6;">
                    新しいProxmox監視ダッシュボードに移行しました！<br>
                    <strong>3秒後に自動でリダイレクトします</strong>
                </p>
                <div style="margin-bottom: 20px;">
                    <strong>新ダッシュボード:</strong><br>
                    <a href="${newUrl}" style="color: #fbbf24; text-decoration: none; font-size: 1.1em;">
                        ${newUrl}
                    </a>
                </div>
                <div style="font-size: 0.9em; opacity: 0.8;">
                    手動で移動する場合は上記リンクをクリック
                </div>
            </div>
        </div>
    `;
}

// 旧システム無効化
class MonitoringDashboard {
    constructor() {
        console.warn('⚠️ 旧MonitoringDashboardは廃止されました');
        console.log('🚀 新システムを起動してください: python server.py');
    }
}

// 旧関数を無効化
function emergencyChartReset() {
    console.log('⚠️ この機能は新システムに移行されました');
}

function emergencyStop() {
    console.log('⚠️ この機能は新システムに移行されました');
}

// グローバル関数をクリーンアップ
window.emergencyChartReset = emergencyChartReset;
window.emergencyStop = emergencyStop;

/*
=== 🔥 完全システム移行 ===

❌ 旧システム (monitor/): 完全廃止
✅ 新システム (server.py): 完全リビルド

新機能:
- 🎨 モダンUI設計
- ⚡ 高速リアルタイム更新
- 📊 Chart.js統合
- 🔄 WebSocket通信
- 📱 レスポンシブ対応
- 🛡️ 安定性向上

起動方法:
1. pip install -r requirements_clean.txt
2. python server.py
3. http://localhost:5000 にアクセス
*/
