#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const dbPath = path.resolve(root, 'audits/apc_pro_20260525/extracted/APC Pro/Data/db3.db');
const outDir = path.resolve(root, `audits/apc_import_${new Date().toISOString().slice(0,10).replace(/-/g,'')}`);
const outJson = path.join(outDir, 'apc_spine.json');
const manifestPath = path.join(outDir, 'manifest.json');
const todoPath = path.join(outDir, 'TODO.md');
const progressPath = path.join(outDir, 'PROGRESS.md');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function q(sql){
  const out = execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  }).trim();
  return out ? JSON.parse(out) : [];
}

function toNum(v){ return v === null || v === undefined || v === '' ? null : Number(v); }

const groups = q(`SELECT Id, Title, Position, IsShow FROM Template_Groups ORDER BY COALESCE(Position, 999999), Title`);
const categories = q(`SELECT Id, GroupId, Title, Position, IsShow, IsShowBreakLine FROM Template_Categories ORDER BY COALESCE(Position, 999999), Title`);
const folders = q(`SELECT Id, CategoryId, Title, Position, IsShow, IsShowAssetButton, IsShowProjectButton, IsHideBranchAttributes, IsHideFolderAttributes, IsHidePersonalAttributes, IsShowCategoryType, SelectedFolderId, IsShowBreakLine FROM Template_Folders ORDER BY COALESCE(Position, 999999), Title`);
const documents = q(`SELECT Id, FolderId, Title, Position, IsShow, Note, FileId, FileName, IsFromServer, IsPdf, IsShowBreakLine, FromFileType, IsMultiPrint, MultiPrintAssetCode FROM Template_Documents ORDER BY COALESCE(Position, 999999), Title`);
const attrs = q(`SELECT ta.Id, ta.FolderId, ta.AttributeId, ca.Title AS AttributeTitle, ta.DataType, ta.Formular, ta.Position, ta.IsShow, ta.IsSearch, ta.Note, ta.IsPrimary, ta.AutoFormular, ta.AttrReference FROM Template_Attributes ta LEFT JOIN Client_Attributes ca ON ca.Id = ta.AttributeId ORDER BY COALESCE(ta.Position, 999999), ca.Title`);

const catByGroup = new Map();
categories.forEach(c=>{ if(!catByGroup.has(c.GroupId)) catByGroup.set(c.GroupId, []); catByGroup.get(c.GroupId).push(c); });
const folderByCat = new Map();
folders.forEach(f=>{ if(!folderByCat.has(f.CategoryId)) folderByCat.set(f.CategoryId, []); folderByCat.get(f.CategoryId).push(f); });
const docByFolder = new Map();
documents.forEach(d=>{ if(!docByFolder.has(d.FolderId)) docByFolder.set(d.FolderId, []); docByFolder.get(d.FolderId).push(d); });
const attrByFolder = new Map();
attrs.forEach(a=>{ if(!attrByFolder.has(a.FolderId)) attrByFolder.set(a.FolderId, []); attrByFolder.get(a.FolderId).push(a); });

const tree = groups.map(g => ({
  id: g.Id,
  title: g.Title,
  position: toNum(g.Position),
  isShow: !!g.IsShow,
  categories: (catByGroup.get(g.Id) || []).map(c => ({
    id: c.Id,
    title: c.Title,
    position: toNum(c.Position),
    isShow: !!c.IsShow,
    isShowBreakLine: c.IsShowBreakLine == null ? null : !!c.IsShowBreakLine,
    folders: (folderByCat.get(c.Id) || []).map(f => ({
      id: f.Id,
      title: f.Title,
      position: toNum(f.Position),
      isShow: !!f.IsShow,
      flags: {
        isShowAssetButton: !!f.IsShowAssetButton,
        isShowProjectButton: !!f.IsShowProjectButton,
        isHideBranchAttributes: f.IsHideBranchAttributes == null ? null : !!f.IsHideBranchAttributes,
        isHideFolderAttributes: f.IsHideFolderAttributes == null ? null : !!f.IsHideFolderAttributes,
        isHidePersonalAttributes: f.IsHidePersonalAttributes == null ? null : !!f.IsHidePersonalAttributes,
        isShowCategoryType: f.IsShowCategoryType == null ? null : !!f.IsShowCategoryType,
        isShowBreakLine: f.IsShowBreakLine == null ? null : !!f.IsShowBreakLine,
      },
      selectedFolderId: f.SelectedFolderId || null,
      documents: (docByFolder.get(f.Id) || []).map(d => ({
        id: d.Id,
        title: d.Title,
        position: toNum(d.Position),
        isShow: !!d.IsShow,
        note: d.Note || null,
        fileId: d.FileId || null,
        fileName: d.FileName || null,
        flags: {
          isFromServer: d.IsFromServer == null ? null : !!d.IsFromServer,
          isPdf: !!d.IsPdf,
          isShowBreakLine: d.IsShowBreakLine == null ? null : !!d.IsShowBreakLine,
          fromFileType: d.FromFileType == null ? null : Number(d.FromFileType),
          isMultiPrint: d.IsMultiPrint == null ? null : !!d.IsMultiPrint,
          multiPrintAssetCode: d.MultiPrintAssetCode || null,
        }
      })),
      attributes: (attrByFolder.get(f.Id) || []).map(a => ({
        id: a.Id,
        attributeId: a.AttributeId,
        attributeTitle: a.AttributeTitle || null,
        dataType: Number(a.DataType),
        formula: a.Formular || null,
        autoFormula: a.AutoFormular || null,
        attrReference: a.AttrReference || null,
        position: toNum(a.Position),
        isShow: !!a.IsShow,
        isSearch: !!a.IsSearch,
        isPrimary: !!a.IsPrimary,
        note: a.Note || null
      }))
    }))
  }))
}));

const counts = {
  groups: groups.length,
  categories: categories.length,
  folders: folders.length,
  documents: documents.length,
  attributes: attrs.length
};

const payload = {
  source: dbPath,
  exportedAt: new Date().toISOString(),
  schema: 'Group -> Category -> Folder -> Documents -> Attributes',
  counts,
  tree
};

fs.writeFileSync(outJson, JSON.stringify(payload, null, 2));
fs.writeFileSync(manifestPath, JSON.stringify({
  kind: 'apc-import',
  output: 'apc_spine.json',
  counts,
  generatedBy: 'scripts/export-apc-spine.js',
  sourceDb: dbPath,
  generatedAt: payload.exportedAt
}, null, 2));
fs.writeFileSync(todoPath, `# TODO APC Import\n\n- [x] Export SQLite APC spine -> JSON\n- [x] Include full ids/title/position/flags/note/fileId/fileName/dataType/formula/isShow/isSearch\n- [ ] Map APC tree into DocxAutomator UI selector (non-breaking)\n- [ ] Bind selected APC document(s) to template loading pipeline\n- [ ] Add regression tests for import counts and schema drift\n`);
if (!fs.existsSync(progressPath)) {
  fs.writeFileSync(progressPath, `# APC Import Progress\n\n- ${new Date().toISOString()} INIT: created progress tracker\n`);
}

console.log(JSON.stringify({ outDir, outJson, counts }, null, 2));
