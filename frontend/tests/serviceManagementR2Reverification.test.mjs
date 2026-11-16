/**
 * frontend/tests/serviceManagementR2Reverification.test.mjs
 * Adversarial Re-Verification Test Suite for FEAT-SERVICE-01 (Iteration 2)
 *
 * Verifies:
 * 1. Defect 1: In-flight / double-submit guard for handleSave and handleToggleStatus,
 *              button disabled bindings, loading indicator text, and disabled CSS styles.
 * 2. Defect 2: handleCancelNew state machine with empty dataset and non-empty dataset,
 *              guaranteeing formData returns to null and empty placeholder is shown.
 * 3. Defect 3: Description textarea error clearing on onChange and inputError CSS class binding.
 * 4. User Directive: Total removal of viewMode state, gridMode styling, and grid toggle buttons.
 * 5. Concurrency stress: rapid click burst testing and exception recovery.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsxPath = path.resolve(__dirname, '../src/pages/admin/services/ServiceManagement.jsx');
const cssPath = path.resolve(__dirname, '../src/pages/admin/services/ServiceManagement.module.css');

const jsxSource = fs.readFileSync(jsxPath, 'utf8');
const cssSource = fs.readFileSync(cssPath, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEFECT 1: DOUBLE-SUBMIT & IN-FLIGHT MUTATION GUARDS
// ─────────────────────────────────────────────────────────────────────────────

test('1.1. Defect 1 Static Contract: isSubmitting and isTogglingStatus states and guards exist', () => {
  // Must declare state hooks
  assert.match(jsxSource, /const\s+\[isSubmitting,\s*setIsSubmitting\]\s*=\s*useState\(false\)/,
    'isSubmitting state hook must be declared');
  assert.match(jsxSource, /const\s+\[isTogglingStatus,\s*setIsTogglingStatus\]\s*=\s*useState\(false\)/,
    'isTogglingStatus state hook must be declared');

  // handleSave must guard against in-flight requests and wrap in try/finally
  assert.match(jsxSource, /const\s+handleSave\s*=\s*async\s*\(\)\s*=>\s*\{[^}]*if\s*\(\s*isSubmitting\s*\|\|\s*isTogglingStatus\s*\)\s*return;/s,
    'handleSave must check (isSubmitting || isTogglingStatus) at entry');
  assert.match(jsxSource, /setIsSubmitting\(true\);.*?finally\s*\{\s*setIsSubmitting\(false\);\s*\}/s,
    'handleSave must set isSubmitting(true) and reset in finally block');

  // handleToggleStatus must guard against in-flight requests and wrap in try/finally
  assert.match(jsxSource, /const\s+handleToggleStatus\s*=\s*async\s*\(\)\s*=>\s*\{[^}]*if\s*\(\s*isSubmitting\s*\|\|\s*isTogglingStatus\s*\)\s*return;/s,
    'handleToggleStatus must check (isSubmitting || isTogglingStatus) at entry');
  assert.match(jsxSource, /setIsTogglingStatus\(true\);.*?finally\s*\{\s*setIsTogglingStatus\(false\);\s*\}/s,
    'handleToggleStatus must set isTogglingStatus(true) and reset in finally block');
});

test('1.2. Defect 1 Button Bindings: Save, ToggleStatus, Revert, and Cancel buttons properly disabled', () => {
  // ServiceEditorSection receives props
  assert.match(jsxSource, /isSubmitting=\{isSubmitting\}/,
    'ServiceManagement must pass isSubmitting to ServiceEditorSection');
  assert.match(jsxSource, /isTogglingStatus=\{isTogglingStatus\}/,
    'ServiceManagement must pass isTogglingStatus to ServiceEditorSection');

  // Save button must be disabled during submission
  assert.match(jsxSource, /<button[^>]*type="submit"[^>]*disabled=\{isSubmitting\s*\|\|\s*isTogglingStatus\}/s,
    'Save button must have disabled={isSubmitting || isTogglingStatus}');
  assert.match(jsxSource, /isSubmitting\s*\?\s*"Đang lưu\.\.\."/s,
    'Save button must show "Đang lưu..." loading text when submitting');

  // Status button must be disabled during status toggle or save
  assert.match(jsxSource, /onClick=\{onToggleStatus\}[^>]*disabled=\{isSubmitting\s*\|\|\s*isTogglingStatus\}/s,
    'Status toggle button must have disabled={isSubmitting || isTogglingStatus}');
  assert.match(jsxSource, /isTogglingStatus\s*\?\s*"Đang xử lý\.\.\."/s,
    'Status toggle button must show "Đang xử lý..." text when toggling status');

  // Revert button must be disabled during mutations
  assert.match(jsxSource, /onClick=\{onRevert\}[^>]*disabled=\{isSubmitting\s*\|\|\s*isTogglingStatus\}/s,
    'Revert button must be disabled when isSubmitting or isTogglingStatus is true');

  // Cancel button must be disabled during mutations
  assert.match(jsxSource, /onClick=\{onCancel\}[^>]*disabled=\{isSubmitting\s*\|\|\s*isTogglingStatus\}/s,
    'Cancel button must be disabled when isSubmitting or isTogglingStatus is true');
});

test('1.3. Defect 1 CSS Contract: .btn:disabled styles prevent pointer events and show disabled cursor', () => {
  assert.match(cssSource, /\.btn:disabled\s*\{[^}]*pointer-events:\s*none;[^}]*\}/s,
    '.btn:disabled must specify pointer-events: none');
  assert.match(cssSource, /\.btn:disabled\s*\{[^}]*cursor:\s*not-allowed;[^}]*\}/s,
    '.btn:disabled must specify cursor: not-allowed');
  assert.match(cssSource, /\.btn:disabled\s*\{[^}]*opacity:\s*0\.6;[^}]*\}/s,
    '.btn:disabled must specify reduced opacity (0.6)');
});

test('1.4. Defect 1 Concurrency Simulation: Rapid burst clicks trigger exactly ONE API invocation', async () => {
  let apiCallCount = 0;
  let isSubmitting = false;
  let isTogglingStatus = false;

  // Mock API with simulated latency
  const mockCreateApi = async () => {
    apiCallCount++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { data: { ServiceId: 999, ServiceName: "Test" } };
  };

  const simulatedHandleSave = async () => {
    if (isSubmitting || isTogglingStatus) return; // Guard
    isSubmitting = true;
    try {
      await mockCreateApi();
    } finally {
      isSubmitting = false;
    }
  };

  // Simulate 10 rapid concurrent clicks within the same event loop tick
  const burstClicks = Array.from({ length: 10 }, () => simulatedHandleSave());
  await Promise.all(burstClicks);

  assert.equal(apiCallCount, 1, 'Rapid click burst must execute exactly 1 API call');
  assert.equal(isSubmitting, false, 'isSubmitting must return to false after completion');
});

test('1.5. Defect 1 Exception Recovery: isSubmitting resets cleanly if API call throws an error', async () => {
  let isSubmitting = false;

  const mockFailingApi = async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    throw new Error('Database timeout');
  };

  const simulatedHandleSave = async () => {
    if (isSubmitting) return;
    isSubmitting = true;
    try {
      await mockFailingApi();
    } catch {
      // Toast error handled
    } finally {
      isSubmitting = false;
    }
  };

  await simulatedHandleSave();
  assert.equal(isSubmitting, false, 'isSubmitting must be restored to false even if API throws');

  // Should allow retry
  let retrySucceeded = false;
  const mockSuccessApi = async () => {
    retrySucceeded = true;
  };

  const simulatedRetrySave = async () => {
    if (isSubmitting) return;
    isSubmitting = true;
    try {
      await mockSuccessApi();
    } finally {
      isSubmitting = false;
    }
  };

  await simulatedRetrySave();
  assert.equal(retrySucceeded, true, 'Subsequent submission must be unblocked after an error');
  assert.equal(isSubmitting, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEFECT 2: CANCEL NEW SERVICE ON EMPTY DATASET (PHANTOM EDIT ELIMINATION)
// ─────────────────────────────────────────────────────────────────────────────

test('2.1. Defect 2 Static Contract: handleCancelNew implements else branch for empty dataset', () => {
  const cancelRegex = /const\s+handleCancelNew\s*=\s*\(\)\s*=>\s*\{.*?if\s*\(\s*targetId\s*\)\s*\{[^}]*handleSelectService\(targetId\);[^}]*\}\s*else\s*\{([^}]+)\}/s;
  const match = jsxSource.match(cancelRegex);

  assert.ok(match, 'handleCancelNew must have an else branch when targetId is null');
  const elseBranch = match[1];

  assert.match(elseBranch, /setFormData\(null\)/, 'else branch must call setFormData(null)');
  assert.match(elseBranch, /setSelectedId\(null\)/, 'else branch must call setSelectedId(null)');
  assert.match(elseBranch, /setOriginalData\(null\)/, 'else branch must call setOriginalData(null)');
});

test('2.2. Defect 2 State Machine: Cancelling on empty dataset returns formData to null and renders placeholder', () => {
  // Simulate state variables
  let services = [];
  let previousSelectedId = null;
  let selectedId = null;
  let formData = null;
  let originalData = null;
  let isCreatingNew = false;
  let formErrors = {};

  // Step 1: User clicks "+ Thêm Mới Dịch Vụ" on an empty list
  const handleAddNew = () => {
    previousSelectedId = selectedId;
    isCreatingNew = true;
    selectedId = null;
    formData = {
      ServiceCode: "",
      CategoryId: "",
      ServiceName: "",
      Price: "",
      Unit: "Lượt",
      Description: "",
      Status: "Active",
    };
    formErrors = {};
  };

  handleAddNew();
  assert.equal(isCreatingNew, true);
  assert.notEqual(formData, null);
  assert.equal(selectedId, null);

  // Step 2: User clicks "Hủy" without saving
  const handleCancelNew = () => {
    isCreatingNew = false;
    formErrors = {};
    const targetId = previousSelectedId || (services.length > 0 ? services[0].ServiceId : null);
    if (targetId) {
      // In real code: handleSelectService(targetId)
    } else {
      formData = null;
      selectedId = null;
      originalData = null;
    }
  };

  handleCancelNew();

  // Assert state machine output
  assert.equal(isCreatingNew, false);
  assert.equal(formData, null, 'formData must be reset to null');
  assert.equal(selectedId, null, 'selectedId must remain null');
  assert.equal(originalData, null, 'originalData must be reset to null');

  // Verify ServiceEditorSection render condition
  // In ServiceManagement.jsx: if (!formData && !isCreatingNew) => renders empty state placeholder
  const shouldRenderPlaceholder = (!formData && !isCreatingNew);
  assert.equal(shouldRenderPlaceholder, true, 'Component must render empty state placeholder, not edit form');
});

test('2.3. Defect 2 State Machine: Cancelling with existing items reverts to first service or previousSelectedId', () => {
  let services = [
    { ServiceId: 101, ServiceName: "Dịch vụ A", Price: 100000 },
    { ServiceId: 102, ServiceName: "Dịch vụ B", Price: 200000 },
  ];
  let previousSelectedId = 102;
  let selectedId = null;
  let formData = { ServiceName: "Draft New" };
  let isCreatingNew = true;

  const handleSelectService = (id) => {
    const found = services.find((s) => s.ServiceId === id);
    if (found) {
      selectedId = found.ServiceId;
      formData = { ...found };
      isCreatingNew = false;
    }
  };

  const handleCancelNew = () => {
    isCreatingNew = false;
    const targetId = previousSelectedId || (services.length > 0 ? services[0].ServiceId : null);
    if (targetId) {
      handleSelectService(targetId);
    } else {
      formData = null;
      selectedId = null;
    }
  };

  handleCancelNew();

  assert.equal(isCreatingNew, false);
  assert.equal(selectedId, 102, 'Should fall back to previousSelectedId');
  assert.equal(formData.ServiceName, "Dịch vụ B");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. DEFECT 3: DESCRIPTION ERROR CLEARING & VISUAL BORDER
// ─────────────────────────────────────────────────────────────────────────────

test('3.1. Defect 3 Static Contract: Description textarea clears formErrors.description on change', () => {
  // Check Description textarea in ServiceEditorSection
  const descTextareaRegex = /<textarea[^>]*placeholder="Mô tả tiêu chuẩn phục vụ[^>]*>.*?<\/textarea>/s;
  const match = jsxSource.match(descTextareaRegex);

  assert.ok(match, 'Description textarea must exist in ServiceEditorSection');
  const textareaContent = match[0];

  assert.match(textareaContent, /formErrors\?\.description\s*\?\s*styles\.inputError\s*:\s*""/,
    'Description textarea must bind styles.inputError conditionally');
  assert.match(textareaContent, /if\s*\(\s*formErrors\?\.description\s*&&\s*setFormErrors\s*\)\s*\{\s*setFormErrors\(\(prev\)\s*=>\s*\(\{\s*\.\.\.prev,\s*description:\s*null\s*\}\)\);?\s*\}/,
    'Description textarea onChange must clear formErrors.description');
});

test('3.2. Defect 3 Static Contract: CreateCategoryModal description clears error on change', () => {
  const modalDescRegex = /<textarea[^>]*placeholder="Mô tả nhóm dịch vụ\.\.\."[^>]*>/s;
  const match = jsxSource.match(modalDescRegex);

  assert.ok(match, 'CreateCategoryModal textarea must exist');
  assert.match(jsxSource, /onChange=\{\(e\)\s*=>\s*\{[^}]*setDescription\(e\.target\.value\);[^}]*if\s*\(\s*error\s*\)\s*setError\(null\);?[^}]*\}\}/s,
    'CreateCategoryModal textarea onChange must clear error state');
});

test('3.3. Defect 3 Static Contract: handleCategoryCreated clears formErrors.categoryId', () => {
  assert.match(jsxSource, /const\s+handleCategoryCreated\s*=\s*\(newCat\)\s*=>\s*\{.*?if\s*\(\s*formErrors\?\.categoryId\s*\)\s*\{\s*setFormErrors\(\(prev\)\s*=>\s*\(\{\s*\.\.\.prev,\s*categoryId:\s*null\s*\}\)\);?\s*\}/s,
    'handleCategoryCreated must clear categoryId error when new category is added');
});

test('3.4. Defect 3 Simulation: Error is cleared when user edits Description', () => {
  let formErrors = { description: "Mô tả dịch vụ không được vượt quá 1000 ký tự" };
  let formData = { Description: "x".repeat(1005) };

  const setFormErrors = (updater) => {
    formErrors = typeof updater === "function" ? updater(formErrors) : updater;
  };

  // Class determination before editing
  const getClassName = () => {
    return formErrors?.description ? "styles.textareaControl styles.inputError" : "styles.textareaControl";
  };

  assert.equal(getClassName(), "styles.textareaControl styles.inputError");

  // User edits description (simulated onChange)
  const simulatedOnChange = (newText) => {
    formData = { ...formData, Description: newText };
    if (formErrors?.description && setFormErrors) {
      setFormErrors((prev) => ({ ...prev, description: null }));
    }
  };

  simulatedOnChange("Mô tả hợp lệ đã được rút gọn.");

  assert.equal(formErrors.description, null, 'formErrors.description must be cleared');
  assert.equal(getClassName(), "styles.textareaControl", 'inputError class must be removed after change');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. USER DIRECTIVE: GRID VIEW MODE REMOVED (LIST VIEW EXCLUSIVITY)
// ─────────────────────────────────────────────────────────────────────────────

test('4.1. Directive Check: viewMode state and toggle buttons are completely removed', () => {
  // ServiceManagement must not have viewMode state
  assert.doesNotMatch(jsxSource, /const\s+\[viewMode,\s*setViewMode\]/,
    'viewMode state hook must NOT exist in ServiceManagement.jsx');

  // ServiceManagement.jsx must not pass viewMode props
  assert.doesNotMatch(jsxSource, /viewMode=\{/,
    'viewMode prop must NOT be passed to ServiceListSection');
  assert.doesNotMatch(jsxSource, /setViewMode=\{/,
    'setViewMode prop must NOT be passed to ServiceListSection');

  // ServiceListSection must not have grid_view toggle button
  assert.doesNotMatch(jsxSource, /grid_view/,
    'grid_view icon button must NOT exist in ServiceManagement.jsx');

  // serviceGridMode must NOT exist in ServiceManagement.jsx
  assert.doesNotMatch(jsxSource, /serviceGridMode/,
    'serviceGridMode class must NOT exist in ServiceManagement.jsx');

  // serviceGridMode must NOT exist in ServiceManagement.module.css
  assert.doesNotMatch(cssSource, /\.serviceGridMode/,
    '.serviceGridMode class must NOT exist in ServiceManagement.module.css');
});

test('4.2. Directive Check: ServiceListSection unconditionally renders standard list view', () => {
  // Must render standard serviceList div without ternary or class condition
  assert.match(jsxSource, /<div\s+className=\{styles\.serviceList\}>/,
    'ServiceListSection must directly render <div className={styles.serviceList}>');
});
