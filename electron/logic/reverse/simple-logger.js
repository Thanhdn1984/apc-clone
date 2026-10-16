// Đơn giản: Ghi logs vào file
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../reverse-logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function appendLog(message) {
    const timestamp = new Date().toLocaleString('vi-VN');
    const logFile = path.join(logsDir, `reverse-${new Date().toISOString().split('T')[0]}.log`);
    const line = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, line, 'utf8');
}

module.exports = { appendLog };
