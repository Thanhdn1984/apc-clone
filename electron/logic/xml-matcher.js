
/**
 * Duyệt qua các nút văn bản XML, tìm và thay thế các chuỗi giá trị một cách thông minh.
 * Nó xử lý trường hợp văn bản bị Word chia thành nhiều lần chạy (<w:r>).
 * @param {Array<Node>} textNodes - Một mảng các nút <w:t> từ DOM.
 * @param {Map<string, string>} reverseMap - Map từ giá trị (vd: "Nguyễn Văn A") đến placeholder (vd: "{ho_ten}").
 */
function findAndReplace(textNodes, reverseMap) {
    const nodesToRemove = new Set();
    const processedIndexes = new Set(); // Theo dõi các chỉ mục đã được xử lý

    for (const [valueToFind, placeholder] of reverseMap.entries()) {
        const valueLength = valueToFind.length;
        if (valueLength === 0) continue;

        // Bắt đầu tìm kiếm từ đầu danh sách các nút văn bản
        for (let i = 0; i < textNodes.length; i++) {
            // Bỏ qua nếu nút này đã là một phần của một kết quả khớp trước đó
            if (processedIndexes.has(i)) {
                continue;
            }

            let combinedText = '';
            const matchedNodes = [];

            // Xây dựng một chuỗi kết hợp từ các nút liên tiếp
            for (let j = i; j < textNodes.length; j++) {
                // Nếu gặp một nút đã được xử lý, chuỗi của chúng ta bị ngắt
                if (processedIndexes.has(j)) {
                    break;
                }

                combinedText += textNodes[j].textContent;
                matchedNodes.push(textNodes[j]);

                // Nếu chuỗi kết hợp BẮT ĐẦU BẰNG giá trị chúng ta đang tìm kiếm
                if (combinedText.startsWith(valueToFind)) {
                    const trailingText = combinedText.substring(valueLength);
                    const firstNode = matchedNodes[0];

                    // 1. Đặt placeholder và phần dư (nếu có) vào nút đầu tiên.
                    // Định dạng của nút đầu tiên sẽ được tự động giữ lại.
                    firstNode.textContent = placeholder + trailingText;

                    // 2. Đánh dấu tất cả các nút tiếp theo trong kết quả khớp để xóa.
                    for (let k = 1; k < matchedNodes.length; k++) {
                        nodesToRemove.add(matchedNodes[k]);
                    }

                    // 3. Đánh dấu tất cả các chỉ mục đã xử lý để không tìm kiếm lại trên chúng.
                    for (let k = 0; k < matchedNodes.length; k++) {
                        processedIndexes.add(i + k);
                    }

                    // Đã tìm thấy và xử lý, thoát khỏi vòng lặp bên trong để bắt đầu tìm kiếm giá trị tiếp theo
                    break; 
                }

                // Tối ưu hóa: Nếu chuỗi kết hợp dài hơn giá trị cần tìm nhưng không khớp,
                // không cần tiếp tục xây dựng chuỗi này nữa.
                if (combinedText.length >= valueLength && !combinedText.startsWith(valueToFind)) {
                    break;
                }
            }
        }
    }

    // Sau khi duyệt qua tất cả, thực hiện xóa các nút đã đánh dấu.
    // Quan trọng: Xóa thẻ cha <w:r> để loại bỏ hoàn toàn khỏi tài liệu.
    nodesToRemove.forEach(node => {
        const runTag = node.parentNode; // Thẻ <w:r>
        if (runTag && runTag.parentNode) {
            runTag.parentNode.removeChild(runTag);
        }
    });
}

module.exports = { findAndReplace };
