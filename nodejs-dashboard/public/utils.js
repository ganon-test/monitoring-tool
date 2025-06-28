/**
 * ユーティリティ関数
 */

// バイト単位フォーマット
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 GB';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// アップタイムフォーマット
function formatUptime(seconds) {
    if (!seconds || seconds === 0) return '0分';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}日`);
    if (hours > 0) parts.push(`${hours}時間`);
    if (minutes > 0) parts.push(`${minutes}分`);
    
    return parts.length > 0 ? parts.join(' ') : '1分未満';
}

// プログレスバーのクラス取得
function getProgressClass(percentage) {
    if (percentage < 50) return 'success';
    if (percentage < 80) return 'warning';
    return 'danger';
}

// 安全なDOM要素更新
function safeUpdateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// プログレスバー更新
function updateProgressBar(id, percentage) {
    const element = document.getElementById(id);
    if (element) {
        element.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }
}

// ローディング表示制御
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}
