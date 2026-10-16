// electron/logic/reverse.js
// BỘ ĐIỀU PHỐI QUY TRÌNH TẠO NGƯỢC - PHIÊN BẢN HỢP NHẤT VÀ TỐI ƯU
const path = require('path');
const fs = require('fs');
const { getAllDocxFiles } = require('./reverse/file-handler');
const { prepareDataForReverse } = require('./reverse/data-preparer');
const { processSingleFileV12 } = require('./reverse/reverse-processor');

let isReverseProcessRunning = false;

const reverseGenerateTemplate = async (event, request) => {
    if (isReverseProcessRunning) {
        return { success: false, code: 'ALREADY_RUNNING', message: 'Một quy trình tạo mẫu ngược đã đang chạy.' };
    }
    isReverseProcessRunning = true;

    const sendProgress = (payload) => {
        try {
            const status = payload.status ? payload.status.toLowerCase() : 'log';
            event.sender.send('reverse-generate-progress', { ...payload, status });
        } catch (e) {
            console.error("[REVERSE] Không thể gửi tiến trình:", e.message);
        }
    };
    
    sendProgress({ status: 'STARTING', message: 'Bắt đầu quy trình tạo ngược...' });

    try {
        const { sourcePaths, destinationPath, inputData, linkedFieldConfig, settings, fields } = request;

        // VALIDATION LAYER: Check all inputs
        if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) throw new Error("sourcePaths phải là một mảng không rỗng.");
        if (typeof destinationPath !== 'string' || !destinationPath.trim()) throw new Error("destinationPath không hợp lệ.");
        if (!inputData || typeof inputData !== 'object' || Object.keys(inputData).length === 0) throw new Error("Dữ liệu nhập liệu không được để trống.");
        if (!Array.isArray(fields)) throw new Error("fields phải là một mảng.");

        // #21: Kiểm tra quyền ghi vào thư mục đích
        try {
            if (!fs.existsSync(destinationPath)) fs.mkdirSync(destinationPath, { recursive: true });
            const testFile = path.join(destinationPath, `.write_test_${Date.now()}`);
            fs.writeFileSync(testFile, '');
            fs.unlinkSync(testFile);
        } catch (e) {
            throw new Error(`Không có quyền ghi vào thư mục đích: ${destinationPath}. Chi tiết: ${e.message}`);
        }
        
        sendProgress({ status: 'ANALYZING', message: 'Phân tích và phân loại dữ liệu...' });

        const { flatReplacements, blockCandidates } = prepareDataForReverse(inputData, linkedFieldConfig, settings, fields);

        if (flatReplacements.length === 0 && blockCandidates.size === 0) {
            throw new Error("Không tìm thấy dữ liệu hợp lệ (có giá trị) để thực hiện thay thế.");
        }

        const allFilesToProcess = getAllDocxFiles(sourcePaths);
        if (allFilesToProcess.length === 0) {
            throw new Error("Không tìm thấy file .docx nào trong các đường dẫn nguồn đã chọn.");
        }

        sendProgress({ status: 'PROCESSING', total: allFilesToProcess.length, current: 0, message: `Bắt đầu xử lý ${allFilesToProcess.length} tệp...` });

        let processedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < allFilesToProcess.length; i++) {
            const sourcePath = allFilesToProcess[i];
            const fileName = path.basename(sourcePath);
            
            sendProgress({ status: 'PROCESSING', total: allFilesToProcess.length, current: i + 1, message: `Đang xử lý: ${fileName}` });
            
            try {
                const result = await processSingleFileV12(
                    sourcePath,
                    destinationPath,
                    flatReplacements,
                    new Map(),
                    blockCandidates,
                    sendProgress
                );

                if (result.success) {
                    processedCount++;
                } else {
                    throw new Error(result.message || 'Lỗi không xác định từ bộ xử lý tệp.');
                }
            } catch (fileError) {
                errorCount++;
                sendProgress({ log: { type: 'error', message: `Lỗi với tệp ${fileName}: ${fileError.message}` }});
            }
        }

        const finalStatusMessage = `Hoàn tất! ${processedCount}/${allFilesToProcess.length} tệp được xử lý thành công.`;
        sendProgress({ status: 'DONE', message: finalStatusMessage, processedCount, errorCount });
        

        return { success: true, message: finalStatusMessage };

    } catch (e) {
        console.error("[REVERSE] Lỗi nghiêm trọng trong quy trình:", e);
        const errorMessage = `Lỗi: ${e.message}`;
        sendProgress({ status: 'ERROR', message: errorMessage });
        return { success: false, error: e.message, code: 'FATAL_ERROR' };
    } finally {
        isReverseProcessRunning = false;
    }
};

module.exports = { reverseGenerateTemplate };
