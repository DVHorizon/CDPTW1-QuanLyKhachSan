# Project: Hotel Management System — Services C1 to C14

## Architecture
- **Backend Architecture**: Express.js REST API + Sequelize ORM + MySQL + WebSocket Hub (`ws`)
  - Modules: `backend/src/modules/services/`, `backend/src/modules/payments/`, `backend/src/modules/statistics/`, `backend/src/modules/ai/`
  - Core Models: `ServiceCategory`, `Service`, `ServiceOrder`, `Payment`, `Invoice`, `InvoiceDetail`, `ChatbotKnowledgeBase`, `ChatbotConversation`, `ChatbotMessage`, `Voucher`
  - Realtime: WebSocket server integrated with HTTP at `backend/src/sockets/socketHandler.js` (`/ws`, `/ws/rooms`, `/ws/v1/dashboard`)
- **Frontend Architecture**: React 18 + Vite 5 + Tailwind CSS + React Router DOM v6
  - Contexts: `AuthContext`, `SocketContext`
  - Routes: Guest portal (`/`, `/services`, `/rooms`, `/booking`, `/payment`), Admin PMS (`/admin/services`, `/admin/services/dispatch`, `/admin/services/orders`, `/admin/charges`, `/admin/folio`, `/admin/tai-chinh`, `/admin/ban-lam-viec`, `/admin/ai-concierge`)
  - UX Constraint: UI/toast messages on frontend MUST only show user-friendly Vietnamese text; technical error codes/status must only be logged to console.
- **Specification & Documentation**: `docs/Spec_ChiTiet_DichVu_C1-C14.txt`, `docs/R2_Spec_Review_Adjustments.md`

## Feature Inventory
| # | Feature Code | Feature Name | Description | Assigned Milestone | Source |
|---|--------------|--------------|-------------|--------------------|--------|
| 1 | R2-SPEC | R2 Spec Adjustments & Audit Documentation | Document 15 spec adjustments in docs/ and update docs/Spec_ChiTiet_DichVu_C1-C14.txt | M1 | Survey |
| 2 | FIX-FOUNDATION | Foundation & Model Fixes | Export Voucher in models/index.js, create 3 Chatbot models + HandledBy, fix C5 test setup script | M1 | Survey |
| 3 | FE-UI-TOAST-CLEAN | Frontend Toast Message Cleaning | Clean technical error codes in ServiceManagement.jsx & ProtectedRoute.jsx to comply with VN-only UI constraint | M1 | Survey |
| 4 | C1 | Quản lý danh mục dịch vụ khách sạn (CRUD) | Service & Category CRUD, validation, active toggle, mark sync-pos out-of-scope | M2 | Spec C1 |
| 5 | C2 | Tra cứu, tìm kiếm & phân loại dịch vụ | Public service browsing page for guests (/services) with Vietnamese NFD search, price filter, category filter | M2 | Spec C2 |
| 6 | C3 | Đặt dịch vụ lưu trú | Guest self-ordering UI & reception dispatch station, snapshot pricing, stay validation | M2 | Spec C3 |
| 7 | C4 | Quản lý tiến độ thực hiện dịch vụ | Service order Kanban board, state machine (Received->InProgress->Completed/Cancelled), mandatory cancelReason | M2 | Spec C4 |
| 8 | C5 | Core Payment Module (Đã có sẵn, hoàn thiện Refund UI) | Payment gateways (Cash, Card, Transfer, VNPay, MoMo, VietQR), refund flow | M3 | Spec C5 |
| 9 | C6 | Tự động gom chi phí lưu trú (Folio Charges) | Folio preview: room charges, completed orders, F&B, minibar, deposit deduction | M3 | Spec C6 |
| 10 | C7 | Tạo hoá đơn tổng hợp (Master Invoice) | CheckedOut stays validation, invoice generation, payment linking, idempotent check | M3 | Spec C7 |
| 11 | C8 | Xuất hoá đơn PDF (Invoice PDF Export) | Dynamic PDF generation with pdfkit, watermark, disk caching, authenticated download | M3 | Spec C8 |
| 12 | C9 | Quyết toán hoá đơn tại quầy (Multi-Tender) | POST /api/v1/invoices/:invoiceId/pay with multiple tenders (Cash, Card, Transfer, QR), change calculation, invoice status update | M3 | Spec C9 |
| 13 | C10 | Sổ cái hoá đơn & Lịch sử giao dịch | GET /api/v1/invoices (pagination, filters, search), GET /api/v1/invoices/:invoiceId/transactions, frontend page /admin/tai-chinh | M3 | Spec C10 |
| 14 | C11 | Master Dashboard thống kê doanh thu real-time | GET /api/v1/statistics/revenue (4 KPIs, 24h trend, room breakdown, F&B list), WebSocket /ws/v1/dashboard, frontend /admin/ban-lam-viec | M4 | Spec C11 |
| 15 | C12 | Báo cáo Occupancy & RevPAR (Xuất Excel) | GET /api/v1/statistics/occupancy (Room-Nights, occupancy %, RevPAR, monthly comparison), /export (Excel/CSV via exceljs), UI report | M4 | Spec C12 |
| 16 | C13 | Chatbot AI Concierge thông minh | POST /api/v1/ai/chatbot (Hybrid Search, Mock/Gemini mode, rate limit), handover routes, floating chat widget on guest portal | M5 | Spec C13 |
| 17 | C14 | Huấn luyện & Quản trị Knowledge Base | CRUD QA pairs in 7 categories, status toggle, test relevance endpoint, frontend Knowledge Base tab in /admin/ai-concierge | M5 | Spec C14 |
| 18 | TEST-E2E | E2E Test Suite (Tiers 1-4) & Adversarial Hardening | Comprehensive opaque-box E2E tests for C1-C14, regression assurance, Tier 5 adversarial tests | M6 & E2E Track | Requirements |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite Track | Design test runner, create Tiers 1-4 test cases (>=5 per feature), publish TEST_READY.md | None | DONE |
| M1 | Foundation, Models & Spec Revision (R2) | Export Voucher in models, add Chatbot models & HandledBy, fix C5 test setup, clean frontend toast messages, create docs/R2_Spec_Review_Adjustments.md & update Spec | None | DONE |
| M2 | Services & Guest Order Flow (C1, C2, C3, C4) | User confirmed already completed. Regression tests pass (test_feat_service_01, test_feat_service_04). Kept intact. | None | DONE |
| M3 | Billing, Multi-Tender & Ledger (C9, C10, C5-C8) | Backend POST /invoices/:id/pay, GET /invoices, GET /invoices/:id/transactions, frontend Multi-Tender modal, /admin/tai-chinh page | M1 | DONE |
| M4 | Real-time Dashboard & Occupancy Reports (C11, C12) | Backend statistics routes (/revenue, /occupancy, /occupancy/export), WebSocket /ws/v1/dashboard, frontend /admin/ban-lam-viec & export UI | M1 | DONE |
| M5 | AI Concierge & Knowledge Base Management (C13, C14) | Backend AI routes (/ai/chatbot, /ai/knowledge-base, handover), guest floating chat widget, admin Knowledge Base UI at /admin/ai-concierge | M1 | DONE |
| M6 | Final E2E Test Pass & Hardening (Tiers 1-5) | Run 100% E2E tests (Tiers 1-4), verify regression suites, Tier 5 white-box adversarial stress testing & forensic audit | E2E, M1, M2, M3, M4, M5 | DONE |

## Interface Contracts

### Master Invoice Settlement Contract (C9)
- Endpoint: `POST /api/v1/invoices/:invoiceId/pay`
- Request Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Request Body:
  ```json
  {
    "tenders": [
      { "method": "Cash", "amount": 1000000, "customerCashGiven": 1200000 },
      { "method": "Card", "amount": 1500000, "transactionCode": "TXN_CARD_123" }
    ],
    "note": "Quyết toán tại quầy lễ tân"
  }
  ```
- Response (200 OK):
  ```json
  {
    "success": true,
    "code": "SUCCESS_INVOICE_SETTLED",
    "message": "Quyết toán hoá đơn thành công",
    "data": {
      "invoiceId": 12,
      "totalAmount": 2500000,
      "paidAmount": 2500000,
      "changeAmount": 200000,
      "status": "Paid",
      "payments": [ ... ]
    }
  }
  ```

### Invoice Ledger Contract (C10)
- Endpoint: `GET /api/v1/invoices?page=1&pageSize=20&status=Paid&fromDate=2026-11-01&toDate=2026-11-02&search=INV-`
- Response (200 OK):
  ```json
  {
    "success": true,
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "data": [
      {
        "invoiceId": 12,
        "invoiceNumber": "INV-20261102-001",
        "bookingId": 5,
        "customerName": "Nguyen Van A",
        "totalAmount": 2500000,
        "status": "Paid",
        "createdAt": "2026-11-02T08:00:00Z"
      }
    ]
  }
  ```
- Endpoint: `GET /api/v1/invoices/:invoiceId/transactions`
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "invoiceId": 12,
      "payments": [ ... ],
      "refunds": [ ... ]
    }
  }
  ```

### Revenue & Real-time Dashboard Contract (C11)
- Endpoint: `GET /api/v1/statistics/revenue?date=2026-11-02`
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "kpis": {
        "revenueToday": 15400000,
        "newBookingsToday": 8,
        "occupancyRate": 82.5,
        "newFnbOrdersToday": 14
      },
      "hourlyRevenue": [ ... 24 hours ... ],
      "roomStatusDistribution": { "Available": 12, "Occupied": 35, "Cleaning": 5, "Maintenance": 2 },
      "recentFnbOrders": [ ... ]
    }
  }
  ```
- WebSocket: `/ws/v1/dashboard`
  - Broadcast payload: `{ "event": "DASHBOARD_UPDATE", "data": { ... } }`

### Occupancy & RevPAR Statistics Contract (C12)
- Endpoint: `GET /api/v1/statistics/occupancy?fromDate=2026-10-01&toDate=2026-10-31`
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "totalRooms": 54,
        "roomNightsAvailable": 1674,
        "roomNightsSold": 1320,
        "occupancyRate": 78.85,
        "totalRoomRevenue": 1584000000,
        "adr": 1200000,
        "revPar": 946236
      },
      "monthlyBreakdown": [ ... ],
      "compareLastYear": { "occupancyChange": 5.2, "revParChange": 8.1 }
    }
  }
  ```
- Endpoint: `GET /api/v1/statistics/occupancy/export?format=xlsx&fromDate=...&toDate=...`
  - Response: Binary file stream with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### AI Concierge & Knowledge Base Contract (C13, C14)
- Endpoint: `POST /api/v1/ai/chatbot`
- Request: `{ "message": "Khách sạn có dịch vụ giặt ủi không?", "conversationId": null }`
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "conversationId": 101,
      "message": "Dạ khách sạn có dịch vụ giặt ủi tiêu chuẩn và giặt hấp...",
      "source": "knowledge_base",
      "handoverRequired": false
    }
  }
  ```
- Endpoint: `GET /api/v1/ai/knowledge-base?category=Services&status=Active&search=giặt`
- Endpoint: `POST /api/v1/ai/knowledge-base` (Admin only)
- Endpoint: `PUT /api/v1/ai/knowledge-base/:id` (Admin only)
- Endpoint: `PATCH /api/v1/ai/knowledge-base/:id/status` (Admin only)
- Endpoint: `GET /api/v1/ai/knowledge-base/test?query=...`

## Code Layout
- Backend Source:
  - Models: `backend/src/models/`
  - Controllers: `backend/src/modules/services/controllers/`, `backend/src/modules/payments/controllers/`, `backend/src/modules/statistics/controllers/`, `backend/src/modules/ai/controllers/`
  - Routes: `backend/src/routes/`, `backend/src/modules/services/routes/`, `backend/src/modules/payments/routes/`
  - Sockets: `backend/src/sockets/socketHandler.js`
  - Tests: `backend/tests/`, `backend/src/tests/`
- Frontend Source:
  - Pages: `frontend/src/pages/`, `frontend/src/pages/admin/`
  - Components: `frontend/src/components/`
  - API Clients: `frontend/src/api/`
  - Routes: `frontend/src/App.jsx`
- Documentation:
  - `docs/Spec_ChiTiet_DichVu_C1-C14.txt`
  - `docs/R2_Spec_Review_Adjustments.md`
