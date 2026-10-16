
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { formatNumber, unformatNumber } from '../../lib/utils.js';

function getDecimalSeparator(locale = 'vi-VN') {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1.1);
    return parts.find(p => p.type === 'decimal')?.value || (locale === 'vi-VN' ? ',' : '.');
  } catch { return locale === 'vi-VN' ? ',' : '.'; }
}

const InputField = ({ field, value, onChange, numberFormat, isFormula, onLinkedChange }) => {
  const { id, name, type, readOnly, isVirtualSumField, defaultValue, linkedFieldIds, placeholder, hint } = field;
  const inputHint = placeholder || hint || `Nhập ${String(name || '').toLowerCase()}`;

  // Boolean fields: render inline checkbox, skip all number/display logic
  if (type === 'boolean') {
    const checked = value === true || value === 'true';
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => !isFormula && onChange(e.target.checked)}
          disabled={isFormula}
          className="w-4 h-4 cursor-pointer accent-purple-600"
        />
        <label htmlFor={id} className="text-sm font-medium text-gray-700 cursor-pointer select-none">
          {name}
        </label>
      </div>
    );
  }

  const isNumeric = type === 'number' || type === 'currency';
  // #4: Guard chống circular linked update — track nguồn gốc của lần update hiện tại
  const isHandlingLinkedUpdate = useRef(false);
  
  // 🔧 v2.2.6: Kiểm tra xem defaultValue có nhiều lựa chọn không (cách nhau bởi #)
  // Mỗi option có thể chứa nhiều giá trị cách nhau bởi | để link với các trường khác
  const { selectOptions, singleLinkedOption } = useMemo(() => {
    if (!defaultValue || typeof defaultValue !== 'string') {
      return { selectOptions: null, singleLinkedOption: null };
    }
    
    const options = defaultValue.split('#').map(opt => opt.trim()).filter(opt => opt.length > 0);
    
    // Parse mỗi option thành { display, values[] }
    const parsedOptions = options.map(opt => {
      const parts = opt.split('|').map(p => p.trim());
      return {
        display: parts[0], // Giá trị hiển thị và giá trị chính
        values: parts      // Tất cả giá trị (bao gồm linked)
      };
    });
    
    if (options.length > 1) {
      // Có nhiều option → dropdown
      return { selectOptions: parsedOptions, singleLinkedOption: null };
    } else if (options.length === 1 && parsedOptions[0].values.length > 1) {
      // Chỉ 1 option nhưng có linked values → input text + áp dụng linked values khi mount
      return { selectOptions: null, singleLinkedOption: parsedOptions[0] };
    }
    
    return { selectOptions: null, singleLinkedOption: null };
  }, [defaultValue]);
  
  // Field is disabled if it's a formula field, readOnly, or virtual sum field
  const isDisabled = isFormula || readOnly || isVirtualSumField;

  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // 🔧 v2.2.6: Dùng ref để track giá trị mới nhất, tránh stale closure trong cleanup
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Debug logging - TẮT cho production
  const DEBUG = false;

  // 🔧 v2.2.6: Áp dụng defaultValue khi value trống (cho tất cả các trường hợp)
  const defaultApplied = useRef(false);
  useEffect(() => {
    // Chỉ áp dụng 1 lần khi mount và value đang trống
    if (defaultApplied.current) return;
    if (value && value !== '') return; // Đã có value rồi
    if (!defaultValue || defaultValue === '') return; // Không có defaultValue
    
    defaultApplied.current = true;
    
    // Trường hợp 1: Có singleLinkedOption (có | nhưng không có #)
    if (singleLinkedOption && linkedFieldIds && linkedFieldIds.length > 0 && onLinkedChange) {
      const displayVal = singleLinkedOption.display;
      const linkedValues = {};
      
      for (let i = 0; i < linkedFieldIds.length; i++) {
        const linkedFieldId = linkedFieldIds[i];
        const linkedValue = singleLinkedOption.values[i + 1] || '';
        linkedValues[linkedFieldId] = linkedValue;
      }
      
      if (DEBUG) {
        console.log(`%c🔗 [${id}] SINGLE LINKED OPTION - applying default:`, 'color: purple; font-weight: bold', displayVal);
        console.log(`%c🔗 [${id}] SINGLE LINKED - linked values:`, 'color: purple', linkedValues);
      }
      
      // Gọi onLinkedChange với source field info để cập nhật cả giá trị chính và linked values
      onLinkedChange(linkedValues, id, displayVal);
      return;
    }
    
    // Trường hợp 2: defaultValue thông thường (không có # và không có |)
    // KHÔNG áp dụng cho selectOptions (dropdown) - để user tự chọn
    if (!selectOptions && !singleLinkedOption) {
      if (DEBUG) {
        console.log(`%c📋 [${id}] APPLYING DEFAULT VALUE:`, 'color: orange; font-weight: bold', defaultValue);
      }
      onChange(defaultValue);
    }
  }, [defaultValue, value, id, selectOptions, singleLinkedOption, linkedFieldIds, onLinkedChange, onChange, DEBUG]);

  // 🔧 v2.2.6: KHÔNG save on unmount cho select fields - chỉ save cho input thường khi đang focus
  useEffect(() => {
    return () => {
      // Bỏ qua select fields - giá trị đã được lưu ngay khi chọn
      if (selectOptions) {
        return;
      }
      
      // 🔧 v2.2.6: Bỏ qua singleLinkedOption fields - giá trị đã được apply khi mount
      if (singleLinkedOption) {
        return;
      }
      
      if (isFocused && displayValue && displayValue !== String(valueRef.current || '')) {
        if (isNumeric) {
          const unformatted = unformatNumber(displayValue, numberFormat);
          if (unformatted && unformatted !== '.' && unformatted !== '') {
            const asNumber = parseFloat(unformatted);
            if (!isNaN(asNumber)) {
              onChange(asNumber);
            }
          }
        } else {
          onChange(displayValue);
        }
      }
    };
  }, [isFocused, displayValue, id, isNumeric, numberFormat, onChange, selectOptions, singleLinkedOption]);

  // Sync displayValue with props value
  useEffect(() => {
    if (!isFocused) {
      // 🔧 v2.2.6: Với select options, KHÔNG tự động chọn option đầu tiên nữa
      // Để người dùng tự chọn hoặc giữ nguyên giá trị đã lưu
      if (selectOptions && value) {
        // Nếu có value, hiển thị đúng value đó
        setDisplayValue(String(value));
        return;
      }
      
      // When not focused, format the value for display
      const shouldFormat = isNumeric && (value !== null && value !== undefined && value !== '');
      const formattedValue = shouldFormat ? formatNumber(value, numberFormat) : (value || '');
      setDisplayValue(String(formattedValue));
    }
    // When focused: KHÔNG sync value → giữ nguyên displayValue user đang gõ!
    // Lý do: Nếu sync, user nhập "1450" → format thành "1.450" → user nhầm lẫn
  }, [value, isFocused, numberFormat, isNumeric, id, DEBUG]);

  const handleChange = (e) => {
    const inputValue = e.target.value;

    setDisplayValue(inputValue); // Show what user is typing
    
    if (isNumeric) {
      // For numeric fields, unformat to get the actual number
      const unformatted = unformatNumber(inputValue, numberFormat);
      
      if (unformatted === '' || unformatted === '.') {
          onChange('');
          return;
      }
      
      // Parse as number - LƯU NGAY khi user type!
      const asNumber = parseFloat(unformatted);
      if (!isNaN(asNumber)) {
          onChange(asNumber);
      }
      // Nếu chưa parse được (đang gõ dở), không gọi onChange - giữ nguyên để user tiếp tục gõ
    } else {
      onChange(inputValue);
    }
  };

  const handleFocus = () => {
      setIsFocused(true);
      if (isNumeric && value !== null && value !== undefined && value !== '') {
        // Hiển thị số không có dấu phân cách hàng nghìn
        // nhưng dùng đúng dấu thập phân theo locale (vi-VN: dấu phẩy)
        const decSep = getDecimalSeparator(numberFormat?.locale || 'vi-VN');
        const raw = String(value); // "1.5" (JavaScript number)
        setDisplayValue(raw.replace('.', decSep)); // "1,5" cho vi-VN
      } else {
        setDisplayValue(String(value || ''));
      }
  };

  const handleBlur = () => {
      setIsFocused(false);
      
      // When blurring, only parse as number if it's a numeric field
      if (isNumeric) {
          try {
              const unformatted = unformatNumber(displayValue, numberFormat);
              if (unformatted === '' || unformatted === '.') {
                  onChange('');
                  return;
              }
              
              const asNumber = parseFloat(unformatted);
              if (!isNaN(asNumber)) {
                  onChange(asNumber);
              } else {
                  onChange('');
              }
          } catch (error) {
              console.error('Error parsing number on blur:', error);
              onChange('');
          }
      } else {
          // For text fields, just keep the value as-is (preserving leading zeros)
          onChange(displayValue);
      }
  };
  
  const handlePaste = (e) => {
    if (isFormula) return; // Chỉ chặn paste nếu là formula

    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    
    const pastedText = clipboardData.getData('text').trim();
    
    // Xử lý đặc biệt cho date
    if (type === 'date') {
      const dateRegex = /^(\d{1,2})[\\/-](\d{1,2})[\\/-](\d{4})$/;
      const match = pastedText.match(dateRegex);

      if (match) {
        e.preventDefault();

        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];

        if (year.length === 4) {
          const formattedDate = `${year}-${month}-${day}`;
          setDisplayValue(formattedDate);
          onChange(formattedDate);
        }
      }
      return;
    }

    // Cho phép paste bình thường cho text và number
    // Xử lý sẽ được handleChange xử lý
  };

  const renderInput = () => {
    const commonProps = {
      id: id,
      value: displayValue,
      className: `w-full p-2 border rounded mt-1 ${isVirtualSumField ? 'bg-blue-50 border-blue-200 font-semibold' : 'bg-white'} disabled:bg-gray-100 disabled:text-gray-500`,
      disabled: isDisabled,
      onChange: !isDisabled ? handleChange : undefined,
      onFocus: !isDisabled ? handleFocus : undefined,
      onBlur: !isDisabled ? handleBlur : undefined,
      onPaste: !isDisabled ? handlePaste : undefined,
      placeholder: inputHint,
    };

    // 🔧 v2.2.6: Render Select nếu có nhiều lựa chọn
    if (selectOptions) {
      const handleSelectChange = (e) => {
        const selectedDisplay = e.target.value;
        
        if (DEBUG) console.log(`[${id}] Select onChange - new: "${selectedDisplay}", props.value: "${value}"`);
        
        // Luôn cập nhật displayValue local
        setDisplayValue(selectedDisplay);
        
        // 🔧 FIX: Chỉ cập nhật linked fields nếu giá trị THỰC SỰ khác với props.value
        // Điều này ngăn việc linked fields bị ghi đè khi không cần thiết
        if (selectedDisplay === value) {
          if (DEBUG) console.log(`[${id}] SKIP - same as props.value`);
          onChange(selectedDisplay);
          return;
        }
        
        if (DEBUG) console.log(`[${id}] Select ACTUALLY changed from "${value}" to "${selectedDisplay}"`);
        
        // 🔧 v2.2.6: Cập nhật các trường liên kết nếu có
        if (linkedFieldIds && linkedFieldIds.length > 0 && onLinkedChange) {
          // Tìm option được chọn
          const selectedOption = selectOptions.find(opt => opt.display === selectedDisplay);
          if (DEBUG) console.log(`[${id}] Found option:`, selectedOption);
          
          if (selectedOption && selectedOption.values.length > 1) {
            // values[0] là giá trị chính (đã set ở trên)
            // values[1], values[2], ... là giá trị cho linkedFieldIds[0], linkedFieldIds[1], ...
            const linkedValues = {};
            for (let i = 0; i < linkedFieldIds.length; i++) {
              const linkedFieldId = linkedFieldIds[i];
              const linkedValue = selectedOption.values[i + 1] || ''; // +1 vì values[0] là giá trị chính
              linkedValues[linkedFieldId] = linkedValue;
            }
            if (DEBUG) console.log(`[${id}] Linked values:`, linkedValues);
            // #4: Bảo vệ vòng lặp circular: nếu đang xử lý linked update từ field khác thì skip
            if (isHandlingLinkedUpdate.current) return;
            isHandlingLinkedUpdate.current = true;
            onLinkedChange(linkedValues, id, selectedDisplay);
            setTimeout(() => { isHandlingLinkedUpdate.current = false; }, 0);
          } else {
            if (DEBUG) console.log(`[${id}] No linked values found - option:`, selectedOption, 'linkedFieldIds:', linkedFieldIds);
            onChange(selectedDisplay);
          }
        } else {
          if (DEBUG) console.log(`[${id}] No linkedFieldIds or onLinkedChange - linkedFieldIds:`, linkedFieldIds);
          onChange(selectedDisplay);
        }
      };
      
      return (
        <select
          id={id}
          value={displayValue}
          className={`w-full p-2 border rounded mt-1 ${isVirtualSumField ? 'bg-blue-50 border-blue-200 font-semibold' : 'bg-white'} disabled:bg-gray-100 disabled:text-gray-500`}
          disabled={isDisabled}
          onChange={handleSelectChange}
        >
          <option value="">-- Chọn --</option>
          {selectOptions.map((option, index) => (
            <option key={index} value={option.display}>
              {option.display}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'longtext') {
      return <textarea {...commonProps} rows="3" />;
    }
    
    const inputType = isNumeric ? 'text' : (type === 'date' ? 'date' : 'text'); // Use 'text' for numeric to allow comma
    const extraProps = type === 'date' ? { max: "9999-12-31" } : { inputMode: isNumeric ? 'decimal' : 'text' };
    
    return <input {...commonProps} {...extraProps} type={inputType} />;
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {isVirtualSumField && <span className="text-blue-500 mr-1">Σ</span>}
        {name}
      </label>
      {renderInput()}
      <p className="mt-1 text-xs text-gray-500">{inputHint}</p>
    </div>
  );
};

export default InputField;
