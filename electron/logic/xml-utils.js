
// electron/logic/xml-utils.js
// Nhiệm vụ: Cung cấp các hàm tiện ích để thao tác với cấu trúc XML của tài liệu Word.

/**
 * Tránh các ký tự đặc biệt trong chuỗi để sử dụng trong RegExp.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lấy toàn bộ nội dung văn bản từ một phần tử và các phần tử con của nó.
 * @param {Element} node - Phần tử XML để trích xuất văn bản.
 * @returns {string} - Nội dung văn bản được nối lại.
 */
const getElementText = (node) => {
    if (!node) return '';
    let text = '';
    const textNodes = node.getElementsByTagName('w:t');
    for (let i = 0; i < textNodes.length; i++) {
        text += textNodes[i].textContent;
    }
    return text;
};

/**
 * Thay thế tất cả các lần xuất hiện của các giá trị trong một nút bằng thẻ giữ chỗ (không phân biệt chữ hoa/thường).
 * @param {Element} node - Phần tử XML để thực hiện thay thế.
 * @param {Array} replacements - Mảng các đối tượng thay thế ({ id, value }).
 * @returns {number} - Số lượng thay thế đã được thực hiện.
 */
const replaceAllInNode = (node, replacements) => {
    if (!node || !replacements || replacements.length === 0) return 0;

    const textNodes = node.getElementsByTagName('w:t');
    let count = 0;

    for (const rep of replacements) {
        if (!rep.value) continue; 

        const valueToFind = rep.value;
        const tagToInsert = rep.id;
        // TẠO REGEX KHÔNG PHÂN BIỆT CHỮ HOA/THƯỜNG
        const regex = new RegExp(escapeRegExp(valueToFind), 'gi');

        for (let i = 0; i < textNodes.length; i++) {
            const textNode = textNodes[i];
            let nodeText = textNode.textContent;

            if (regex.test(nodeText)) {
                // Thay thế tất cả các lần xuất hiện trong node văn bản
                textNode.textContent = nodeText.replace(regex, tagToInsert);
                count++;
            }
        }
    }
    return count;
};

/**
 * Tạo một đoạn văn bản (w:p) mới chứa thẻ docxtemplater.
 * @param {Document} doc - Đối tượng tài liệu XML.
 * @param {string} tag - Thẻ cần chèn (ví dụ: `{#loop}` hoặc `{/loop}`).
 * @returns {Element} - Phần tử w:p mới.
 */
const createTagParagraph = (doc, tag) => {
    const p = doc.createElement('w:p');
    const r = doc.createElement('w:r');
    const t = doc.createElement('w:t');
    t.appendChild(doc.createTextNode(tag));
    r.appendChild(t);
    p.appendChild(r);
    return p;
};

/**
 * Tìm khối cha chứa một phần tử (thường là w:body hoặc w:tc).
 * @param {Element} element - Phần tử con (w:p hoặc w:tr).
 * @returns {Element} - Khối cha.
 */
const getParentBlock = (element) => {
    let parent = element.parentNode;
    while (parent) {
        if (parent.tagName === 'w:body' || parent.tagName === 'w:tc') {
            return parent;
        }
        parent = parent.parentNode;
    }
    return element.ownerDocument.documentElement; // Fallback
};

/**
 * Xóa một danh sách các node khỏi cây XML.
 * @param {Array<Element>} nodesToRemove - Mảng các node cần xóa.
 */
const removeNodes = (nodesToRemove) => {
    if (!nodesToRemove || nodesToRemove.length === 0) return;
    [...nodesToRemove].forEach(node => {
        if (node && node.parentNode) {
            node.parentNode.removeChild(node);
        }
    });
};

module.exports = { getElementText, replaceAllInNode, createTagParagraph, removeNodes, getParentBlock };
