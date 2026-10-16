
// electron/logic/templates.js
const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { FormulaModule } = require('./formulas.js');

// Recursive function to find all .docx files within a directory
const findDocxFilesRecursive = (dirPath, fileList = []) => {
    try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            try {
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    findDocxFilesRecursive(fullPath, fileList);
                } else if (path.extname(fullPath).toLowerCase() === '.docx') {
                    fileList.push(fullPath);
                }
            } catch (e) {
                console.warn(`Could not stat path ${fullPath}: ${e.message}`);
            }
        }
    } catch(e) {
        console.error(`Could not read directory ${dirPath}: ${e.message}`);
    }
    return fileList;
};

// --- COMPLETELY REVISED: addTemplates function ---
const addTemplates = async () => {
  // 1. Ask the user what they want to do first.
  const choice = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Chọn Từng File', 'Chọn Cả Thư Mục', 'Hủy'],
      title: 'Thêm Mẫu',
      message: 'Bạn muốn thêm các mẫu riêng lẻ hay chọn từ một thư mục?',
      defaultId: 0, // "Chọn Từng File" is the default
      cancelId: 2   // The "Hủy" button
  });

  if (choice.response === 2) { // User clicked "Hủy"
    return { success: false, canceled: true };
  }

  let dialogResult;
  let allDocxPaths = [];

  // 2. Show the appropriate dialog based on user's choice.
  if (choice.response === 0) { // User chose "Chọn Từng File"
      dialogResult = await dialog.showOpenDialog({
          title: 'Chọn một hoặc nhiều mẫu (.docx)',
          properties: ['openFile', 'multiSelections'],
          filters: [{ name: 'Word Documents', extensions: ['docx'] }]
      });

      if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
          return { success: false, canceled: true };
      }
      allDocxPaths = dialogResult.filePaths;

  } else { // User chose "Chọn Cả Thư Mục"
      dialogResult = await dialog.showOpenDialog({
          title: 'Chọn một hoặc nhiều thư mục chứa mẫu',
          properties: ['openDirectory', 'multiSelections']
      });

      if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
          return { success: false, canceled: true };
      }
      
      // Process all selected directories to find .docx files
      for (const dirPath of dialogResult.filePaths) {
          allDocxPaths = allDocxPaths.concat(findDocxFilesRecursive(dirPath));
      }
  }

  // 3. Process the final list of file paths.
  const uniquePaths = [...new Set(allDocxPaths)];

  if (uniquePaths.length === 0) {
      dialog.showMessageBox({ title: 'Không tìm thấy file', message: 'Không tìm thấy file .docx nào trong lựa chọn của bạn.' });
      return { success: true, data: [] }; 
  }

  return { success: true, data: processTemplatesByPath(uniquePaths) };
};


// --- UNCHANGED: processTemplatesByPath function ---
function processTemplatesByPath(paths) {
  return paths.map(filePath => {
    const templateData = { id: `template_${Date.now()}_${Math.random()}`, name: path.basename(filePath), path: filePath, tags: [], error: null };
    try {
      if (!fs.existsSync(filePath)) { throw new Error('File không tìm thấy tại đường dẫn đã lưu.'); }
      const content = fs.readFileSync(filePath, 'binary');
      const zip = new PizZip(content);
      const tagInspector = { 
          getTags() { return this.tags; }, 
          postparse(parsed) { 
              this.tags = parsed.filter(p => p.type === "placeholder").map(p => p.value); 
              return parsed; 
          }
      };
      new Docxtemplater(zip, { modules: [tagInspector, new FormulaModule()], delimiters: { start: '{', end: '}' } });
      templateData.tags = [...new Set(tagInspector.getTags())];
    } catch (e) {
      console.error(`[Main] Error parsing DOCX '${filePath}':`, e);
      templateData.error = e.name === 'CorruptZipError' ? 'File không phải .docx hợp lệ.' : e.message;
    }
    return templateData;
  });
}

module.exports = { addTemplates, processTemplatesByPath };
