import React, { useState, useRef } from 'react';

const MenuForm = ({ 
  isEditing, 
  formData, 
  setFormData, 
  categoriesList = [],
  handleSave, 
  onCancel,
  onDelete
}) => {
  const [uploadError, setUploadError] = useState('');
  const [imgBroken, setImgBroken] = useState(false);
  const fileInputRef = useRef(null);

  // Reset imgBroken khi đổi món hoặc đổi imageUrl
  React.useEffect(() => {
    setImgBroken(false);
    setUploadError('');
  }, [formData.ImageUrl, formData.ItemName]);

  // Xử lý chọn ảnh từ máy tính với validation định dạng sâu (MIME + Extension + Magic Bytes + Image Decode)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const validExtensions = ['.png', '.jpg', '.jpeg'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext));
    const hasValidMime = validTypes.includes(file.type);

    // 1. Chặn tất cả các file không phải PNG / JPG (chặn pdf, word doc/docx, excel, v.v.)
    if (!hasValidMime || !hasValidExt) {
      setUploadError('Định dạng file không hợp lệ! Hệ thống chỉ chấp nhận ảnh PNG hoặc JPG. Không được chọn file PDF, Word, Excel hay tài liệu khác.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Kiểm tra dung lượng tối thiểu: >= 1KB (1024 bytes)
    if (file.size < 1024) {
      setUploadError(`Dung lượng ảnh quá nhỏ (${(file.size / 1024).toFixed(2)} KB)! Ảnh món ăn phải có dung lượng từ 1KB trở lên.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. Kiểm tra dung lượng tối đa: <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(`Dung lượng ảnh vượt quá giới hạn (${(file.size / (1024 * 1024)).toFixed(2)} MB)! Dung lượng tối đa là 5MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 4. KIỂM TRA MAGIC BYTES NHỊ PHÂN (Chặn triệt để file PDF, Word đổi đuôi sang .jpg / .png)
    try {
      const headerSlice = await file.slice(0, 4).arrayBuffer();
      const header = new Uint8Array(headerSlice);
      const isJpeg = header.length >= 3 && header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
      const isPng = header.length >= 4 && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;

      if (!isJpeg && !isPng) {
        setUploadError('Tệp tải lên không phải là ảnh hợp lệ! Hệ thống phát hiện file tài liệu (PDF, Word, Excel...) bị cố tình đổi đuôi sang .jpg/.png.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    } catch (readErr) {
      setUploadError('Không thể đọc dữ liệu file. Vui lòng chọn ảnh khác!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 5. Đọc file thành Base64 Data URL và kiểm tra khả năng giải mã ảnh thực tế
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;

      // Dùng HTML Image Object kiểm tra render thực tế
      const testImg = new Image();
      testImg.onload = () => {
        if (testImg.naturalWidth === 0 || testImg.naturalHeight === 0) {
          setUploadError('File ảnh bị lỗi hoặc không thể hiển thị nội dung. Vui lòng chọn ảnh khác!');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        setUploadError('');
        setImgBroken(false);
        setFormData(prev => ({
          ...prev,
          ImageUrl: dataUrl
        }));
      };
      testImg.onerror = () => {
        setUploadError('Nội dung file không thể giải mã thành ảnh hợp lệ! Không chấp nhận file giả mạo.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      testImg.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, ImageUrl: '' }));
    setUploadError('');
    setImgBroken(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.ImageUrl || formData.ImageUrl.trim() === '') {
      setUploadError('Vui lòng tải lên ảnh món ăn từ máy tính (ảnh là bắt buộc)!');
      return;
    }
    if (imgBroken) {
      setUploadError('Ảnh hiện tại bị lỗi hoặc không thể hiển thị. Vui lòng bấm Đổi Ảnh Khác để tải ảnh hợp lệ!');
      return;
    }
    const priceNum = Number(formData.Price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setUploadError('Giá bán niêm yết phải lớn hơn 0 VNĐ!');
      return;
    }
    setUploadError('');
    handleSave(e);
  };

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col h-full justify-between gap-space-md">
      <div className="flex flex-col gap-space-md">
        
        {/*  Drawer Header  */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col w-full gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm font-mono text-admin-primary font-bold uppercase tracking-wider whitespace-nowrap">
                HỒ SƠ ĐỊNH LƯỢNG KỸ THUẬT // 
              </span>
              {isEditing && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30 font-bold">
                  🔒 Optimistic Lock v{formData.Version || 1}
                </span>
              )}
            </div>
            
            <input 
              type="text" 
               
              value={formData.ItemName} 
              onChange={e => setFormData({...formData, ItemName: e.target.value})}
              placeholder="Nhập tên món ăn..."
              className="font-display-lg text-headline-lg font-bold text-on-surface bg-transparent border-b border-outline-variant focus:border-admin-primary outline-none w-full pb-1 transition-colors"
            />
            
            <input 
              type="text" 
              value={formData.Description || ''} 
              onChange={e => setFormData({...formData, Description: e.target.value})}
              placeholder="Mô tả chi tiết món ăn (tiếng Anh hoặc note cho bếp)..."
              className="font-body-sm text-body-sm text-on-surface-variant italic bg-transparent border-b border-outline-variant focus:border-admin-primary outline-none w-full pb-1 transition-colors"
            />
          </div>
          
          <select 
            value={formData.Status} 
            onChange={e => setFormData({...formData, Status: e.target.value})}
            className={`cursor-pointer outline-none appearance-none font-label-sm text-label-sm font-bold shadow-sm px-4 py-2 rounded-full ${formData.Status === 'Available' ? 'bg-admin-primary/10 text-admin-primary' : formData.Status === 'OutOfStock' ? 'bg-tertiary/10 text-tertiary' : 'bg-error-container text-on-error-container'}`}
          >
            <option value="Available">🟢 Đang Mở Bán</option>
            <option value="OutOfStock">🟠 Hết Hàng 86'd</option>
            <option value="Inactive">🔴 Ngừng Bán / Khóa</option>
          </select>
        </div>

        {/* Hidden File Input (Chỉ nhận PNG, JPG, JPEG) */}
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={handleFileChange}
          className="hidden"
        />

        {/*  Visual Image Upload Area (Lấy ảnh từ máy tính)  */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-admin-primary">photo_camera</span>
              Ảnh Món Ăn (Tải Từ Máy Tính) *
            </span>
            <span className="text-[11px] text-slate-500 font-mono">PNG / JPG, ≥ 1KB</span>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full h-52 rounded-xl overflow-hidden border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center group ${
              uploadError 
                ? 'border-rose-400 bg-rose-50/50' 
                : (formData.ImageUrl && formData.ImageUrl.trim().length > 5 && !imgBroken)
                  ? 'border-emerald-500/50 bg-slate-900' 
                  : 'border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-slate-100/70'
            }`}
          >
            {(formData.ImageUrl && formData.ImageUrl.trim().length > 5 && !imgBroken) ? (
              <>
                <img 
                  src={formData.ImageUrl} 
                  alt={formData.ItemName || 'Ảnh món ăn'} 
                  onError={() => setImgBroken(true)}
                  onLoad={() => setImgBroken(false)}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 p-3">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-800 rounded-lg text-xs font-bold shadow-md hover:bg-slate-100 transition"
                  >
                    <span className="material-symbols-outlined text-[16px]">autorenew</span>
                    Đổi Ảnh Khác
                  </button>
                  <button 
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-rose-700 transition"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Xóa Ảnh
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center p-4 gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-slate-800">
                    Bấm vào đây để chọn ảnh từ máy tính
                  </p>
                  <p className="text-xs text-slate-500">
                    Chỉ hỗ trợ file ảnh <strong>PNG</strong> hoặc <strong>JPG/JPEG</strong> (từ 1KB đến 5MB)
                  </p>
                  {imgBroken && (
                    <span className="inline-block mt-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      ⚠️ Ảnh cũ không tồn tại. Vui lòng bấm chọn ảnh mới từ máy tính.
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-700 text-white text-xs font-semibold shadow-xs">
                  <span className="material-symbols-outlined text-[14px]">folder_open</span>
                  Duyệt File
                </span>
              </div>
            )}
          </div>

          {/* Thông báo lỗi upload chi tiết */}
          {uploadError && (
            <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-shake">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
              <span className="font-medium leading-relaxed">{uploadError}</span>
            </div>
          )}
        </div>

        {/*  Financial & Margin Cost Breakdown  */}
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
          <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">Cấu Trúc Chi Phí &amp; Phân Loại</span>
          
          <div className="grid grid-cols-2 gap-space-md pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-body-sm font-body-sm text-on-surface-variant">Giá Bán Niêm Yết (VNĐ) *</span>
              <input 
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Nhập giá bán (VD: 55000)..."
                value={
                  formData.Price === 0 || formData.Price === '0' || formData.Price === '' || formData.Price === null || formData.Price === undefined
                    ? '' 
                    : formData.Price
                } 
                onFocus={(e) => {
                  e.target.select();
                }}
                onChange={(e) => {
                  const rawVal = e.target.value.replace(/[^0-9]/g, '');
                  if (rawVal === '') {
                    setFormData({ ...formData, Price: '' });
                  } else {
                    const cleanNum = parseInt(rawVal, 10);
                    setFormData({ ...formData, Price: isNaN(cleanNum) ? '' : cleanNum });
                  }
                }}
                className="font-mono font-bold text-body-lg text-on-surface bg-surface border border-outline-variant rounded-lg px-3 py-2.5 focus:border-admin-primary outline-none w-full shadow-inner"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-body-sm font-body-sm text-on-surface-variant">Danh Mục Nhóm *</span>
              <select 
                value={formData.CategoryId} 
                onChange={e => setFormData({...formData, CategoryId: Number(e.target.value)})}
                className="font-bold text-body-sm text-on-surface bg-surface border border-outline-variant rounded-lg px-3 py-2.5 focus:border-admin-primary outline-none w-full shadow-inner cursor-pointer"
              >
                {categoriesList && categoriesList.length > 0 ? (
                  categoriesList.map(cat => (
                    <option key={cat.CategoryId} value={cat.CategoryId}>
                      {cat.CategoryName}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>Khai Vị Nóng</option>
                    <option value={2}>Khai Vị Lạnh</option>
                    <option value={5}>Khai Vị Hải Sản</option>
                    <option value={6}>Bếp Nóng</option>
                    <option value={7}>Bếp Lạnh</option>
                    <option value={8}>Tráng Miệng</option>
                  </>
                )}
              </select>
            </div>
          </div>


          
          <div className="flex items-center justify-between pt-space-xs mt-space-sm border-t border-surface-container-highest font-label-sm text-label-sm text-on-surface-variant">
            <span>Phụ thu In-room Dining: <strong className="text-on-surface">+15% Service Tray</strong></span>
            <span>Thuế &amp; Phí: <strong className="text-on-surface">VAT 8% + Phí PV 5%</strong></span>
          </div>
        </div>


      </div>

      {/*  Action Command Buttons  */}
      <div className="flex flex-col sm:flex-row items-center gap-space-xs pt-space-lg mt-space-md border-t border-surface-container-high">
        <button 
          type="submit" 
          className="w-full sm:w-auto flex-1 flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold rounded-lg hover:brightness-105 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>{isEditing ? 'Lưu Cập Nhật Công Thức' : 'Lưu Món Mới'}</span>
        </button>
        <button 
          type="button" 
          onClick={onCancel}
          className="w-full sm:w-auto flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-surface-container text-on-surface font-label-md text-label-md font-semibold rounded-lg hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">cancel</span>
          <span>Hủy Bỏ</span>
        </button>
        {isEditing && (
          <button 
            type="button" 
            onClick={onDelete}
            className="w-full sm:w-auto flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-error/10 text-error font-label-md text-label-md font-semibold rounded-lg hover:bg-error hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>Khóa POS / Xóa</span>
          </button>
        )}
      </div>
    </form>
  );
};

export default MenuForm;
