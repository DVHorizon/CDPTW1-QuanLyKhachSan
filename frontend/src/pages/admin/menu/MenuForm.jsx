import React, { useState } from 'react';

const MenuForm = ({ 
  isEditing, 
  formData, 
  setFormData, 
  handleSave, 
  onCancel,
  onDelete
}) => {
  const [isEditingImage, setIsEditingImage] = useState(false);

  return (
    <form onSubmit={handleSave} className="flex flex-col h-full justify-between gap-space-md">
      <div className="flex flex-col gap-space-md">
        
        {/*  Drawer Header  */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col w-full gap-2 pr-4">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm font-mono text-admin-primary font-bold uppercase tracking-wider whitespace-nowrap">
                HỒ SƠ ĐỊNH LƯỢNG KỸ THUẬT // 
              </span>
              
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
            className={`cursor-pointer outline-none appearance-none font-label-sm text-label-sm font-bold shadow-sm px-4 py-2 rounded-full ${formData.Status === 'Available' ? 'bg-admin-primary/10 text-admin-primary' : formData.Status === 'Out of Stock' ? 'bg-tertiary/10 text-tertiary' : 'bg-error-container text-on-error-container'}`}
          >
            <option value="Available">🟢 Đang Mở Bán</option>
            <option value="Out of Stock">🟠 Hết Hàng 86'd</option>
            <option value="Inactive">🔴 Khóa Ẩn</option>
          </select>
        </div>

        {/*  Visual Preview Card  */}
        <div className="relative w-full h-52 rounded-xl overflow-hidden shadow-sm bg-surface-container flex items-center justify-center group">
           <img src={formData.ImageUrl || "https://loremflickr.com/320/240/food,dish?lock=999"} alt={formData.ItemName} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
           
           {!isEditingImage ? (
             <div onClick={() => setIsEditingImage(true)} className="absolute inset-0 bg-black/5 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                <div className="flex items-center gap-2 bg-white/90 text-on-surface font-bold px-4 py-2 rounded-lg shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                  Thay Ảnh Món / Dán Link
                </div>
             </div>
           ) : (
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
                <div className="flex flex-col gap-2 w-full max-w-sm bg-white p-3 rounded-lg shadow-xl">
                  <span className="text-label-sm font-bold text-on-surface">Nhập đường dẫn ảnh (URL):</span>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="https://example.com/image.jpg"
                    value={formData.ImageUrl || ''}
                    onChange={(e) => setFormData({...formData, ImageUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-outline-variant rounded font-mono text-body-sm focus:outline-none focus:border-admin-primary"
                  />
                  <div className="flex gap-2 justify-end mt-1">
                    <button type="button" onClick={() => setIsEditingImage(false)} className="px-4 py-1.5 bg-admin-primary text-white font-bold text-label-sm rounded hover:brightness-110">Xong</button>
                  </div>
                </div>
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
                type="number" 
                 
                min="0" 
                value={formData.Price} 
                onChange={e => setFormData({...formData, Price: Number(e.target.value)})}
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
                <option value={1}>Món Khai Vị</option>
                <option value={2}>Món Chính</option>
                <option value={3}>Tráng Miệng</option>
                <option value={4}>Đồ Uống / Bar</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-space-xs mt-space-sm border-t border-surface-container-highest font-label-sm text-label-sm text-on-surface-variant">
            <span>Phụ thu In-room Dining: <strong className="text-on-surface">+15% Service Tray</strong></span>
            <span>Thuế &amp; Phí: <strong className="text-on-surface">VAT 8% + Phí PV 5%</strong></span>
          </div>
        </div>
        
        {/*  Recipe BOM (Bill of Materials) Mini Table (MOCKUP) */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">Định Lượng Nguyên Liệu Bếp (BOM)</span>
            <button className="text-admin-primary font-label-sm text-label-sm font-semibold hover:underline" type="button">Chỉnh Định Lượng</button>
          </div>
          <div className="bg-surface-container rounded-lg p-2 font-body-sm text-body-sm flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-mono text-label-sm">
              <span className="text-on-surface font-sans">1. {formData.ItemName || 'Chưa nhập tên món'} tiêu chuẩn</span>
              <span className="text-on-surface font-bold">1 Lô định mức</span>
            </div>
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
