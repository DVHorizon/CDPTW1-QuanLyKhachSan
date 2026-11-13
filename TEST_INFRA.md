# E2E Test Infrastructure & Testing Methodology
## Hotel Management System — Services C1 to C14

### 1. Overview & Architecture
This test infrastructure establishes an opaque-box, requirement-driven end-to-end testing track for the Grand Horizon Hotel Management System, specifically covering **Module C: Services, Billing, Reporting & AI Concierge (Features C1 to C14)**.

All tests execute against the running HTTP/REST and WebSocket server at `http://localhost:5000/api/v1` using standard Node.js runtime, without modifying production codebase.

---

### 2. The 4-Tier Opaque-Box Methodology

The test suite is structured across 4 distinct testing tiers, ensuring both granular verification and holistic workflow assurance:

```
+-----------------------------------------------------------------------------------+
| Tier 4: Real-World Lifecycle Scenarios                                            |
| Complete end-to-end guest journeys (Check-in -> Orders -> Folio -> Pay -> Audit) |
+-----------------------------------------------------------------------------------+
| Tier 3: Cross-Feature Combinations & Workflows                                    |
| Pairwise integration (Ordering -> Folio -> Invoice -> Multi-Tender -> Reporting)  |
+-----------------------------------------------------------------------------------+
| Tier 2: Boundary, Edge & Corner Cases (>=5 per feature: 70 tests)                 |
| Invalid transitions, overflows, negative values, unauthenticated/forbidden paths  |
+-----------------------------------------------------------------------------------+
| Tier 1: Core Feature Coverage (>=5 per feature: 70 tests)                         |
| Primary happy paths, field validations, status transitions, contract conformance  |
+-----------------------------------------------------------------------------------+
```

#### Tier 1: Feature Coverage (>= 5 tests per feature: C1 to C14)
- **C1 (FEAT-SERVICE-01)**: Service Categories CRUD, Service items CRUD, Soft-delete deactivate/reactivate, Auto ServiceCode generation, sync-pos removal check.
- **C2 (FEAT-SERVICE-02)**: Public service listing, Unicode NFD accent-insensitive search, Category filtering, Price range filtering, Pagination contract.
- **C3 (FEAT-SERVICE-03)**: Guest self-ordering, Reception dispatch terminal batch order, Snapshot unit pricing, In-house stay validation, Active stays discovery.
- **C4 (FEAT-SERVICE-04)**: Service Order Kanban state transitions (Received -> InProgress -> Completed), Cancellation with reason, Role permission checks.
- **C5 (FEAT-PAYMENT-01)**: Multi-channel payment requests (Cash, Card, Transfer, MoMo, VietQR), Mock gateway callbacks, Payment lookup, Refund workflows.
- **C6 (FEAT-INVOICE-01)**: Booking Folio charge aggregation, InProgress vs Completed service separation, F&B RoomInvoice charges, Minibar charges, Deposit deduction, Idempotency.
- **C7 (FEAT-INVOICE-02)**: Master Folio Invoice generation, InvoiceDetails itemization, Idempotent check (409 on duplicate), Token authentication, Invoice lookup.
- **C8 (FEAT-INVOICE-03)**: Invoice PDF binary rendering (`%PDF-`), Disk caching validation, `pdf-info` metadata endpoint, authenticated download, Cancelled watermark.
- **C9 (FEAT-INVOICE-04)**: Multi-tender cashier settlement (`POST /invoices/:id/pay`), Cash with change calculation, Split Card + QR tender, Status change to Paid.
- **C10 (FEAT-INVOICE-05)**: Invoice Ledger (`GET /invoices`) with pagination & filters (status, date range, search), Transaction audit history (`GET /invoices/:id/transactions`).
- **C11 (FEAT-REPORT-01)**: Real-time Revenue Dashboard (`GET /statistics/revenue`), 4 core KPIs, 24-hour revenue trend, physical room distribution, WebSocket `/ws/v1/dashboard`.
- **C12 (FEAT-REPORT-02)**: Occupancy & RevPAR statistics (`GET /statistics/occupancy`), ADR/RevPAR formula verification, Excel XLSX export (`GET /statistics/occupancy/export`).
- **C13 (FEAT-AI-01)**: AI Concierge chatbot message interaction (`POST /ai/chatbot`), Knowledge Base resolution, Conversation history continuity, Staff handover trigger.
- **C14 (FEAT-AI-02)**: Knowledge Base management (`/ai/knowledge-base`), QA pair CRUD across 7 hotel categories, Active status toggle, Semantic relevance test endpoint.

#### Tier 2: Boundary & Corner Cases (>= 5 tests per feature: C1 to C14)
- **C1**: Duplicate category name (case/accent insensitive), Zero/negative prices, Inactive category reference, Non-admin forbidden, Extreme string lengths.
- **C2**: Special characters in search, Out-of-bounds pagination, Inactive services exclusion, Inverted price filter (min > max), Non-existent category ID returns empty (200 OK).
- **C3**: Order for non-existent stay, Order for non-checked-in stay, Zero/negative quantity, Inactive service order attempt, Guest cross-stay security boundary.
- **C4**: Missing cancelReason when cancelling, Invalid transition (Completed -> InProgress), Invalid transition (Cancelled -> Completed), Guest cancelling InProgress order (403), Non-existent order ID.
- **C5**: Guest attempting Cash method (403), Zero/negative payment amount, Refund exceeding paid amount, Refund on already refunded transaction, Non-existent booking ID.
- **C6**: Unauthenticated charges request (401), Guest requesting unauthorized stay charges (403), Non-existent booking ID (404), Empty stay before check-in, Read-only idempotency stress.
- **C7**: Duplicate master invoice generation (ERROR_0017_ALREADY_EXISTS), Non-existent booking (404), Unauthenticated request (401), Format validation of InvoiceNumber, Pending service warning.
- **C8**: PDF request for non-existent invoice (404), Unauthenticated PDF access (401), Cancelled invoice watermark enforcement, Invalid invoice ID format, Forbidden cross-tenant guest access.
- **C9**: Tender sum less than remaining balance (underpayment), Non-cash tender exceeding remaining balance, Settlement on already Paid invoice, Settlement on Cancelled invoice, Insufficient cash given.
- **C10**: Ledger request without token (401), Unauthorized guest access (403), Date range where fromDate > toDate, Pagination beyond total records, Non-existent invoice transactions lookup.
- **C11**: Malformed date parameter (400), Unauthorized guest access (403), Unauthenticated access (401), Far future / far past date graceful zero-handling, Missing date fallback to current date.
- **C12**: Date range inverted fromDate > toDate, Unsupported export format request, Unauthenticated access (401), Non-staff role access (403), Leap year / end-of-month date boundary.
- **C13**: Empty / whitespace-only query, Extreme length query (>1000 chars), Prompt injection defense ("ignore instructions"), Rapid spam rate limit check, Non-existent conversation ID handling.
- **C14**: Empty question or answer, Invalid category name, Non-admin write attempt (403), Non-existent knowledge item update (404), Duplicate question detection.

#### Tier 3: Cross-Feature Combinations (Pairwise & Multi-Stage Chains)
- **Workflow 3.1: Ordering to Folio Aggregation (C1/C2 -> C3 -> C4 -> C6)**
  - Admin creates service, guest searches and orders service, service marked Completed, Folio charges immediately aggregate the item into remaining balance.
- **Workflow 3.2: Folio Aggregation to Master Invoice (C6 -> C7)**
  - Folio charge breakdown directly informs Master Invoice creation; line items reflect room charges, service orders, and minibar.
- **Workflow 3.3: Master Invoice to Multi-Tender Settlement & Ledger (C7 -> C9 -> C10)**
  - Master invoice created in Unpaid state, settled via Cash + Card multi-tender, invoice transitions to Paid, appears in Invoice Ledger and Transaction History.
- **Workflow 3.4: Settlement to Real-Time Dashboard & Reporting (C9 -> C11 -> C12)**
  - Multi-tender payment settlement immediately propagates to Revenue Dashboard KPIs and contributes to Occupancy/RevPAR metrics.
- **Workflow 3.5: Knowledge Base Training to AI Concierge (C14 -> C13)**
  - Admin adds new hotel policy QA item, guest queries AI Concierge, AI immediately answers utilizing the newly created knowledge entry.

#### Tier 4: Real-World Scenarios (Complete Guest Lifecycle)
- **Scenario 4.1: The Leisure Guest Journey**
  - Check-in -> Browse services -> Order Spa & Laundry -> Track order status to Completed -> Minibar & F&B Room Service -> Folio Charges Review -> Master Invoice Generation -> Multi-Tender Settlement -> PDF Invoice Download -> Revenue Dashboard update.
- **Scenario 4.2: Corporate Guest with Split Billing & Order Adjustments**
  - Room check-in -> Order Room Service -> Request service cancellation with valid reason -> Order replacement item -> Settle via Card + Transfer -> Verify audit log & Invoice Ledger.

---

### 3. Progressive Testability & Milestone Handling

Because implementation follows milestones:
- **Existing Endpoints (C1 to C8)**: Actively executed and asserted against the live backend server. All assertions must pass 100%.
- **Pending Endpoints (C9 to C14)**: Handled via the **Opaque Contract Probe Pattern**. The test runner verifies the contract definition; if the endpoint is not yet mounted (returns 404/501), it records the test with status `PENDING_IMPLEMENTATION` along with the expected request/response contract. As implementing agents complete Milestones M3, M4, and M5, these exact tests execute and turn green with zero modification needed.

---

### 4. Test Suite Layout & File Structure

```
backend/tests/e2e_services_c1_c14/
|-- runner.js                               # Master test runner CLI & reporter
|-- helpers/
|   |-- apiClient.js                        # HTTP & WebSocket client with timing & auth
|   |-- authHelper.js                       # JWT tokens for Admin, Receptionist, Guest
|   |-- assertionHelper.js                  # Opaque assertions & pending contract handlers
|   +-- fixtures.js                         # Mock IDs, dates, test categories & payloads
|-- tier1_features/                         # 14 files (>= 5 tests each = 70+ tests)
|   |-- test_c01_service_crud.js
|   |-- test_c02_service_search.js
|   |-- test_c03_service_order.js
|   |-- test_c04_order_progress.js
|   |-- test_c05_core_payment.js
|   |-- test_c06_folio_charges.js
|   |-- test_c07_master_invoice.js
|   |-- test_c08_invoice_pdf.js
|   |-- test_c09_multi_tender.js
|   |-- test_c10_invoice_ledger.js
|   |-- test_c11_revenue_dashboard.js
|   |-- test_c12_occupancy_revpar.js
|   |-- test_c13_ai_chatbot.js
|   +-- test_c14_knowledge_base.js
|-- tier2_boundaries/                       # 14 files (>= 5 tests each = 70+ tests)
|   |-- test_c01_boundaries.js
|   |-- test_c02_boundaries.js
|   |-- test_c03_boundaries.js
|   |-- test_c04_boundaries.js
|   |-- test_c05_boundaries.js
|   |-- test_c06_boundaries.js
|   |-- test_c07_boundaries.js
|   |-- test_c08_boundaries.js
|   |-- test_c09_boundaries.js
|   |-- test_c10_boundaries.js
|   |-- test_c11_boundaries.js
|   |-- test_c12_boundaries.js
|   |-- test_c13_boundaries.js
|   +-- test_c14_boundaries.js
|-- tier3_cross_feature/
|   +-- test_tier3_workflows.js             # 5 pairwise & multi-feature workflow chains
+-- tier4_scenarios/
    +-- test_tier4_lifecycle.js             # 2 comprehensive real-world guest journeys
```

---

### 5. Running the Tests

From the project root or `backend` directory:

```bash
# Run the entire E2E test suite across all 4 tiers
node backend/tests/e2e_services_c1_c14/runner.js

# Run specific tier only
node backend/tests/e2e_services_c1_c14/runner.js --tier=1
node backend/tests/e2e_services_c1_c14/runner.js --tier=2
node backend/tests/e2e_services_c1_c14/runner.js --tier=3
node backend/tests/e2e_services_c1_c14/runner.js --tier=4

# Run specific feature only (e.g. C1 or C6 or C9)
node backend/tests/e2e_services_c1_c14/runner.js --feature=C1
node backend/tests/e2e_services_c1_c14/runner.js --feature=C6

# Run only currently existing endpoints (C1-C8)
node backend/tests/e2e_services_c1_c14/runner.js --existing-only

# Generate JSON report for CI/CD or orchestrator consumption
node backend/tests/e2e_services_c1_c14/runner.js --json
```
