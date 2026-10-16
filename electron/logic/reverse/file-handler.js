// electron/logic/reverse/file-handler.js
// Module xử lý file và các hộp thoại tương tác với người dùng.

const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Mở hộp thoại cho người dùng chọn file/thư mục nguồn.
 * @returns {Promise<string[] | null>} Mảng các đường dẫn file hoặc null nếu hủy.
 */
const selectSourceFiles = async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile', 'openDirectory', 'multiSelections'],
        filters: [{ name: 'Word Documents', extensions: ['docx'] }],
        title: 'Chọn file hoặc thư mục nguồn'
    });
    if (canceled || !filePaths || filePaths.length === 0) return null;
    return filePaths;
};

/**
 * Mở hộp thoại cho người dùng chọn thư mục để lưu kết quả.
 * @returns {Promise<string | null>} Đường dẫn thư mục hoặc null nếu hủy.
 */
const selectSaveDirectory = async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Chọn thư mục để lưu các file mẫu'
    });
    const saveDirectory = filePaths && filePaths[0];
    if (canceled || !saveDirectory) return null;
    return saveDirectory;
};

/**
 * Lấy tất cả các đường dẫn file .docx từ các đường dẫn nguồn (có thể là file hoặc thư mục).
 * @param {string[]} paths - Mảng các đường dẫn nguồn.
 * @returns {string[]} Mảng các đường dẫn file .docx hợp lệ.
 */
const getAllDocxFiles = (paths) => {
    const docxFiles = [];
    const walkSync = (dir) => {
        try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                const fullPath = path.join(dir, file.name);
                if (file.isDirectory()) {
                    walkSync(fullPath);
                } else if (path.extname(file.name).toLowerCase() === '.docx' && !path.basename(fullPath).startsWith('~')) {
                    docxFiles.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`[REVERSE-FH] Lỗi đọc thư mục ${dir}:`, error);
        }
    };

    for (const p of paths) {
        try {
            const stats = fs.statSync(p);
            if (stats.isDirectory()) {
                walkSync(p);
            } else if (path.extname(p).toLowerCase() === '.docx' && !path.basename(p).startsWith('~')) {
                docxFiles.push(p);
            }
        } catch (error) {
            console.error(`[REVERSE-FH] Lỗi kiểm tra đường dẫn ${p}:`, error);
        }
    }
    return docxFiles;
};

module.exports = { 
    selectSourceFiles, 
    selectSaveDirectory, 
    getAllDocxFiles 
};
