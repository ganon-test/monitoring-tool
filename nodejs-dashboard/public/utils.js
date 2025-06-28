/**
 * ユーティリティ関数
 */

// バイト単位フォーマット（異常値チェック付き）
function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 GB';
    
    // 異常に大きな値（1PB以上）は無効値として扱う
    if (bytes > 1125899906842624) {
        return 'N/A';
    }
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ネットワーク/ディスク速度フォーマット（バイト/秒）
function formatSpeed(bytesPerSecond, decimals = 1) {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    
    // 異常に大きな値（1GB/s以上）は無効値として扱う
    if (bytesPerSecond > 1073741824) {
        return 'N/A';
    }
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ネットワーク統計フォーマット（受信/送信の合計表示）
function formatNetworkStats(netio) {
    if (!netio) return 'N/A';
    
    const netin = parseFloat(netio.netin) || 0;
    const netout = parseFloat(netio.netout) || 0;
    
    // 異常値チェック
    if (netin > 1073741824 || netout > 1073741824) {
        return 'N/A';
    }
    
    if (netin === 0 && netout === 0) {
        return '0 B/s';
    }
    
    const total = netin + netout;
    return formatSpeed(total);
}

// ディスクIO統計フォーマット（読み取り/書き込みの合計表示）
function formatDiskStats(diskio) {
    if (!diskio) return 'N/A';
    
    const read = parseFloat(diskio.diskread) || 0;
    const write = parseFloat(diskio.diskwrite) || 0;
    
    // 異常値チェック
    if (read > 1073741824 || write > 1073741824) {
        return 'N/A';
    }
    
    if (read === 0 && write === 0) {
        return '0 B/s';
    }
    
    const total = read + write;
    return formatSpeed(total);
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
