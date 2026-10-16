import React, { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, Loader2, ScanText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { mapOCRToFields } from '../../utils/ocrUtils.js';

const IMAGE_ROTATIONS = [0, 90, 270];

const rotateImageFile = (file, degrees) => new Promise((resolve, reject) => {
  if (degrees === 0) return resolve(file);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const swap = degrees === 90 || degrees === 270;
    canvas.width = swap ? img.height : img.width;
    canvas.height = swap ? img.width : img.height;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Không xoay được ảnh')), file.type || 'image/jpeg', 0.95);
  };
  img.onerror = reject;
  img.src = URL.createObjectURL(file);
});

const scoreOcrText = (text) => {
  const lower = String(text || '').toLowerCase();
  let score = 0;
  ['họ', 'tên', 'full name', 'cccd', 'mst', 'ngày cấp', 'place of residence', 'thường trú'].forEach(token => {
    if (lower.includes(token)) score += 10;
  });
  const numbers = (text.match(/\b\d{9,12}\b/g) || []).length;
  score += numbers * 8;
  score += Math.min(text.length / 80, 10);
  return score;
};

const OCRUpload = ({ fields, onAutoFill, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [previewImages, setPreviewImages] = useState([]);
  const [ocrText, setOcrText] = useState('');
  const [mappedFields, setMappedFields] = useState({});
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback((event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const invalidFile = files.find(file => !file.type.startsWith('image/'));
    if (invalidFile) {
      setError('Vui lòng chỉ chọn file ảnh (JPG, PNG, ...)');
      return;
    }

    const oversizedFile = files.find(file => file.size > 10 * 1024 * 1024);
    if (oversizedFile) {
      setError('Có file ảnh quá lớn. Vui lòng chọn file nhỏ hơn 10MB.');
      return;
    }

    setError(null);
    setPreviewImages(files.map(file => URL.createObjectURL(file)));
    setOcrText('');
    setMappedFields({});

    // Start OCR processing
    processOCR(files);
  }, [fields]);

  const processOCR = async (imageFiles) => {
    setIsProcessing(true);
    setProgress(0);
    setStatus('Đang khởi động OCR...');

    try {
      const texts = [];
      for (let index = 0; index < imageFiles.length; index++) {
        const imageFile = imageFiles[index];
        let bestText = '';
        let bestScore = -1;
        for (const rotation of IMAGE_ROTATIONS) {
          const rotatedFile = await rotateImageFile(imageFile, rotation);
          const result = await Tesseract.recognize(
            rotatedFile,
            'vie+eng',
            {
              logger: (m) => {
                if (m.status === 'recognizing text') {
                  const rotationIndex = IMAGE_ROTATIONS.indexOf(rotation);
                  const fileProgress = (rotationIndex + (m.progress || 0)) / IMAGE_ROTATIONS.length;
                  const totalProgress = ((index + fileProgress) / imageFiles.length) * 100;
                  setProgress(Math.round(totalProgress));
                  setStatus(`Ảnh ${index + 1}/${imageFiles.length}: thử xoay ${rotation}°... ${Math.round((m.progress || 0) * 100)}%`);
                } else {
                  setStatus(`Ảnh ${index + 1}/${imageFiles.length}: ${m.status}`);
                }
              }
            }
          );
          const candidateText = result.data.text || '';
          const candidateScore = scoreOcrText(candidateText);
          if (candidateScore > bestScore) {
            bestText = candidateText;
            bestScore = candidateScore;
          }
        }
        texts.push(bestText);
      }

      const text = texts.join('\n');
      setOcrText(text);
      setStatus('Đang phân tích dữ liệu...');

      // Map OCR text to fields
      const mapped = mapOCRToFields(text, fields);
      setMappedFields(mapped);
      
      const fieldCount = Object.keys(mapped).length;
      setStatus(`Hoàn tất! Tìm thấy ${fieldCount} trường dữ liệu`);
      setProgress(100);

    } catch (err) {
      console.error('[OCR] Error:', err);
      setError('Lỗi khi xử lý ảnh. Vui lòng thử lại.');
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyFields = () => {
    if (Object.keys(mappedFields).length > 0) {
      onAutoFill(mappedFields);
      onClose?.();
    }
  };

  const handleClear = () => {
    setPreviewImages([]);
    setOcrText('');
    setMappedFields({});
    setError(null);
    setStatus('');
    setProgress(0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3">
            <ScanText className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Quét CCCD / Giấy tờ</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left side - Upload area */}
          <div className="w-1/2 p-6 border-r flex flex-col">
            {!previewImages.length ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <Upload className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-600 text-center mb-2">
                  Kéo thả ảnh CCCD/giấy tờ vào đây
                </p>
                <p className="text-gray-400 text-sm mb-4">hoặc</p>
                <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                  Chọn file ảnh
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-gray-400 text-xs mt-4">Hỗ trợ chọn nhiều ảnh: JPG, PNG, WebP (mỗi file tối đa 10MB)</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="relative flex-1 min-h-[200px] bg-gray-100 rounded-lg overflow-y-auto p-2 grid grid-cols-2 gap-2">
                  {previewImages.map((src, index) => (
                    <img 
                      key={src}
                      src={src} 
                      alt={`Ảnh ${index + 1}`} 
                      className="w-full h-40 object-contain bg-white rounded border"
                    />
                  ))}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <Loader2 className="w-10 h-10 text-white animate-spin mb-2" />
                      <p className="text-white text-center px-4">{status}</p>
                    </div>
                  )}
                </div>
                
                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {!isProcessing && previewImages.length > 0 && (
                  <button 
                    onClick={handleClear}
                    className="mt-3 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Xóa và chọn ảnh khác
                  </button>
                )}
              </div>
            )}

            {/* Progress bar */}
            {isProcessing && (
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">{status}</p>
              </div>
            )}
          </div>

          {/* Right side - Results */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Kết quả nhận dạng
            </h3>

            {Object.keys(mappedFields).length === 0 && !isProcessing && (
              <div className="text-center py-8 text-gray-400">
                <p>Chưa có dữ liệu</p>
                <p className="text-sm mt-1">Tải ảnh lên để bắt đầu quét</p>
              </div>
            )}

            {Object.keys(mappedFields).length > 0 && (
              <>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {Object.entries(mappedFields).map(([fieldId, value]) => {
                    const field = fields.find(f => f.id === fieldId);
                    return (
                      <div 
                        key={fieldId}
                        className="p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {field?.name || fieldId}
                          </p>
                          <p className="text-sm text-gray-600 font-mono">{String(value)}</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={handleApplyFields}
                  className="mt-4 w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Áp dụng vào form ({Object.keys(mappedFields).length} trường)
                </button>
              </>
            )}

            {/* Raw text toggle */}
            {ocrText && (
              <div className="mt-4">
                <details>
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    Xem văn bản gốc
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                    {ocrText}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCRUpload;
