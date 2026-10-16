const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const { TSDemuxer } = require('../../node_modules/docxtemplater/dist/docxtemplater.js');

const reverseGenerate = (templatePath, replacements, blockCandidates, nonIndependentValues) => {
    try {
        console.log("--- BẮT ĐẦU QUY TRÌNH TẠO NGƯỢC (V14) ---");
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { 
            paragraphLoop: true,
            linebreaks: true,
        });

        const textContent = doc.getFullText();

        // Create a sorted list of replacements, longest value first
        const sortedReplacements = [...replacements].sort((a, b) => b.value.length - a.value.length);

        let newTextContent = textContent;
        const appliedReplacements = [];

        sortedReplacements.forEach(rep => {
            // V14 DIAGNOSTIC LOG
            console.log(`[CHUẨN ĐOÁN SO KHỚP] Đang tìm kiếm giá trị: "${rep.value}" (cho placeholder: {${rep.key}})`);
            
            if (rep.value && newTextContent.includes(rep.value)) {
                const placeholder = `{${rep.key}}`;
                // Use a global regex to replace all occurrences
                const regex = new RegExp(escapeRegExp(rep.value), 'g');
                newTextContent = newTextContent.replace(regex, placeholder);
                appliedReplacements.push({ from: rep.value, to: placeholder });

            } else {

            }
        });


        return { success: true, newTextContent, appliedReplacements };

    } catch (error) {
        console.error("[LỖI TẠO NGƯỢC]", error);
        return { success: false, error: error.message };
    }
};

// Helper function to escape special characters for regex
function escapeRegExp(string) {
    // Escape characters with special meaning either inside or outside character sets.
    // Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be ambiguous.
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&'); // $& means the whole matched string
}

module.exports = { reverseGenerate };
