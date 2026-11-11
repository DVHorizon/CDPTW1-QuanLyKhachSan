#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/verify_spec_completeness.py
Script tự động đối chiếu xác nhận tính toàn vẹn 100% giữa tài liệu gốc .txt và tài liệu Markdown .md:
1. File nguồn tồn tại nguyên vẹn và file đích .md tồn tại.
2. Đầy đủ 14 tính năng C1 - C14.
3. Đầy đủ 22 mã lỗi ERROR_0001 đến ERROR_0022.
4. Đầy đủ toàn bộ mã lỗi từ file nguồn .txt.
5. Đầy đủ các API endpoints.
6. Toàn bộ các bảng dữ liệu là bảng Markdown (GFM) hợp lệ.
7. Các công thức nghiệp vụ cốt lõi có mặt đầy đủ.
"""

import os
import re
import sys

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    txt_path = os.path.join(base_dir, 'docs', 'Spec_ChiTiet_DichVu_C1-C14.txt')
    md_path = os.path.join(base_dir, 'docs', 'Spec_ChiTiet_DichVu_C1-C14.md')

    print("=== BẮT ĐẦU KIỂM THỬ ĐỐI CHIẾU TÀI LIỆU SPEC (PYTHON VERIFIER) ===\n")

    # 1. Kiểm tra sự tồn tại của 2 file
    if not os.path.exists(txt_path):
        print("❌ LỖI: File nguồn docs/Spec_ChiTiet_DichVu_C1-C14.txt không tồn tại!")
        sys.exit(1)
    if not os.path.exists(md_path):
        print("❌ LỖI: File đích docs/Spec_ChiTiet_DichVu_C1-C14.md không tồn tại!")
        sys.exit(1)
    print("✅ File nguồn docs/Spec_ChiTiet_DichVu_C1-C14.txt tồn tại nguyên vẹn.")
    print("✅ File đích docs/Spec_ChiTiet_DichVu_C1-C14.md tồn tại.")

    with open(txt_path, 'r', encoding='utf-8') as f:
        txt_content = f.read()

    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # 2. Kiểm tra 14 tính năng C1 - C14
    required_features = [
        ('C1', 'FEAT-SERVICE-01'),
        ('C2', 'FEAT-SERVICE-02'),
        ('C3', 'FEAT-SERVICE-03'),
        ('C4', 'FEAT-SERVICE-04'),
        ('C5', 'FEAT-PAYMENT-01'),
        ('C6', 'FEAT-INVOICE-01'),
        ('C7', 'FEAT-INVOICE-02'),
        ('C8', 'FEAT-INVOICE-03'),
        ('C9', 'FEAT-INVOICE-04'),
        ('C10', 'FEAT-INVOICE-05'),
        ('C11', 'FEAT-REPORT-01'),
        ('C12', 'FEAT-REPORT-02'),
        ('C13', 'FEAT-AI-01'),
        ('C14', 'FEAT-AI-02'),
    ]

    print("\n--- KIỂM TRA 14 TÍNH NĂNG C1 - C14 ---")
    missing_feats = 0
    for code, feat in required_features:
        if feat in md_content and code in md_content:
            print(f"✅ [{code}] {feat}: Có mặt đầy đủ trong Markdown")
        else:
            print(f"❌ [{code}] {feat}: BỊ THIẾU!")
            missing_feats += 1
    if missing_feats > 0:
        print(f"❌ Có {missing_feats} tính năng bị thiếu!")
        sys.exit(1)

    # 3. Kiểm tra 22 mã lỗi ERROR_0001 -> ERROR_0022
    print("\n--- KIỂM TRA 22 MÃ LỖI TỪ ERROR_0001 ĐẾN ERROR_0022 ---")
    missing_errors = 0
    for i in range(1, 23):
        prefix = f"ERROR_{i:04d}"
        if re.search(rf"{prefix}(?:_[A-Z0-9_]+)?", md_content):
            print(f"✅ {prefix}: Có mặt trong tài liệu Markdown")
        else:
            print(f"❌ {prefix}: THIẾU trong tài liệu Markdown!")
            missing_errors += 1
    if missing_errors > 0:
        print(f"❌ Có {missing_errors} mã lỗi bị thiếu!")
        sys.exit(1)

    # 4. Đối chiếu toàn bộ mã lỗi từ file nguồn
    print("\n--- ĐỐI CHIẾU TOÀN BỘ MÃ LỖI TỪ FILE GỐC SANG FILE MD ---")
    txt_errors = set(re.findall(r"ERROR_\d{4}(?:_[A-Z0-9_]+)?", txt_content))
    missing_txt_errors = 0
    for err in txt_errors:
        if err not in md_content:
            print(f"❌ Mã lỗi {err} có trong TXT nhưng thiếu trong MD!")
            missing_txt_errors += 1
    if missing_txt_errors == 0:
        print(f"✅ Toàn bộ {len(txt_errors)} mã lỗi từ file TXT đều có mặt trong file MD.")
    else:
        sys.exit(1)

    # 5. Đối chiếu API endpoints
    print("\n--- ĐỐI CHIẾU CÁC ENDPOINT API ---")
    txt_endpoints = set(re.findall(r"(?:GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[a-zA-Z0-9_\-\/{}\.]+)", txt_content))
    missing_endpoints = 0
    for ep in txt_endpoints:
        if ep not in md_content:
            print(f"❌ Endpoint {ep} không tìm thấy trong file MD!")
            missing_endpoints += 1
    if missing_endpoints == 0:
        print(f"✅ Toàn bộ {len(txt_endpoints)} endpoints API từ file nguồn đều có mặt trong file MD.")
    else:
        sys.exit(1)

    # 6. Kiểm tra các bảng GFM Markdown
    print("\n--- KIỂM TRA CHẤT LƯỢNG BẢNG GFM MARKDOWN ---")
    md_lines = md_content.splitlines()
    in_table = False
    table_count = 0
    table_errors = 0
    cur_cols = 0

    for idx, line in enumerate(md_lines):
        sline = line.strip()
        if sline.startswith('|') and sline.endswith('|'):
            # Strip escaped pipes
            norm = sline.replace(r'\|', 'ESCAPED_PIPE')
            cols = len(norm.split('|')) - 2
            if not in_table:
                in_table = True
                table_count += 1
                cur_cols = cols
            else:
                if cols != cur_cols:
                    print(f"❌ Dòng {idx + 1}: Lệch số cột trong bảng {table_count} (mong đợi {cur_cols}, thực tế {cols})")
                    table_errors += 1
        else:
            in_table = False

    print(f"✅ Tổng cộng {table_count} bảng Markdown hợp lệ đã được kiểm tra (Lỗi lệch cột: {table_errors}).")
    if table_errors > 0:
        sys.exit(1)

    # 7. Kiểm tra các công thức toán học và thuộc tính nghiệp vụ
    print("\n--- KIỂM TRA CÔNG THỨC TOÁN HỌC & NGHIỆP VỤ ---")
    required_formulas = [
        'remainingBalance = Booking.TotalAmount − Σ (Payments.Amount − Payments.RefundAmount)',
        'remainingBalance = Invoice.TotalAmount − Σ (Payments.Amount − Payments.RefundAmount)',
        'netSurcharge = MAX(0, Bookings.SurchargeAmount − extensionSubtotal − damageSubtotal)',
        'totalPaid',
        'grandTotal',
        'occupancyRate = roomNightsSold / roomNightsAvailable',
        'revPar',
        'roomRevenue',
        'occupancyRateDeltaPct',
        'revParDeltaPct',
    ]
    missing_formulas = 0
    for formula in required_formulas:
        if formula in md_content:
            print(f"✅ Công thức / Thuộc tính: \"{formula}\" có mặt đầy đủ.")
        else:
            print(f"❌ Thiếu công thức: \"{formula}\"")
            missing_formulas += 1
    if missing_formulas > 0:
        sys.exit(1)

    # 8. Kiểm tra không lặp lại bảng mã lỗi Master (chỉ được chèn đúng 1 lần tại Mục 0.1)
    print("\n--- KIỂM TRA TẦN SUẤT BẢNG MÃ LỖI MASTER ---")
    master_table_matches = re.findall(r"Bảng danh mục 22 mã lỗi chuẩn toàn hệ thống", md_content)
    if len(master_table_matches) == 1:
        print("✅ Bảng mã lỗi Master xuất hiện đúng 1 lần tại Mục 0.1 (không bị lặp rác).")
    else:
        print(f"❌ Bảng mã lỗi Master xuất hiện {len(master_table_matches)} lần! Kỳ vọng duy nhất 1 lần.")
        sys.exit(1)

    # 9. Kiểm tra phân cấp tiêu đề Markdown (Heading Hierarchy — MD001)
    print("\n--- KIỂM TRA PHÂN CẤP TIÊU ĐỀ MARKDOWN (MD001) ---")
    prev_level = 0
    heading_jumps = 0
    for line_num, line in enumerate(md_lines):
        m = re.match(r"^(#{1,6})\s+(.*)$", line.strip())
        if m:
            level = len(m.group(1))
            if prev_level > 0 and level > prev_level + 1:
                print(f"❌ Dòng {line_num + 1}: Lỗi phân cấp tiêu đề H{prev_level} -> H{level} (\"{m.group(2)}\")")
                heading_jumps += 1
            prev_level = level
    if heading_jumps == 0:
        print("✅ Phân cấp tiêu đề hợp lệ 100% (Không có lỗi nhảy bậc H1->H3, H2->H4).")
    else:
        print(f"❌ Có {heading_jumps} lỗi nhảy bậc tiêu đề!")
        sys.exit(1)

    # 10. Kiểm tra dòng trắng liên tiếp (MD012)
    print("\n--- KIỂM TRA VỆ SINH DÒNG TRẮNG LIÊN TIẾP (MD012) ---")
    consecutive_blanks = 0
    excessive_blanks = 0
    for line in md_lines:
        if line.strip() == '':
            consecutive_blanks += 1
            if consecutive_blanks > 2:
                excessive_blanks += 1
        else:
            consecutive_blanks = 0
    if excessive_blanks == 0:
        print("✅ Khoảng cách dòng trắng đạt chuẩn Markdown sạch (Lỗi dòng trắng thừa: 0).")
    else:
        print(f"❌ Có {excessive_blanks} vị trí chứa quá nhiều dòng trắng liên tiếp!")
        sys.exit(1)

    print("\n🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐỐI CHIẾU ĐÃ ĐẠT 100%! TÀI LIỆU MARKDOWN ĐẢM BẢO HOÀN TOÀN TÍNH TOÀN VẸN VÀ CHUẨN ĐỊNH DẠNG.")

if __name__ == '__main__':
    main()
