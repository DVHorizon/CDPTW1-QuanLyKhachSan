'use strict';

const assert = require('assert');

function fail(message, context = {}) {
  const err = new Error(message);
  err.name = 'QaAssertionError';
  err.context = context;
  throw err;
}

function assertStatus(res, expectedStatuses, label = 'HTTP status') {
  const list = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];
  if (!res || !list.includes(res.status)) {
    fail(
      `${label}: expected status in [${list.join(', ')}], got ${res ? res.status : 'null'} (body=${res ? res.rawText?.slice(0, 300) : ''})`,
      { status: res?.status, data: res?.data }
    );
  }
}

function assertNo500(res, label = 'No HTTP 500') {
  if (!res) fail(`${label}: missing response`);
  if (res.status >= 500) {
    fail(`${label}: unexpected 5xx (${res.status}) — ${res.rawText?.slice(0, 300)}`, {
      status: res.status,
      data: res.data,
    });
  }
}

function assertErrorCode(res, expectedCodes, label = 'Error code') {
  const list = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
  const actualCode = res?.data?.code || res?.data?.errorCode || null;
  if (!list.includes(actualCode)) {
    fail(`${label}: expected error code in [${list.join(', ')}], got ${actualCode}`, {
      status: res?.status,
      data: res?.data,
    });
  }
}

// Scenario 1: Deleting an already-deleted/cancelled/refunded item must fail cleanly (not 200/500)
function assertS1DeleteConflict(res, label = 'S1 Delete non-existent/already-deleted') {
  assertNo500(res, label);
  if (![400, 404, 409].includes(res.status)) {
    fail(`${label}: expected 400/404/409 on stale delete, got ${res.status}`, { data: res.data });
  }
  if (res.data && res.data.success === true) {
    fail(`${label}: response unexpectedly returned success=true`, { data: res.data });
  }
}

// Scenario 2: Stale optimistic-lock update must return 409 Conflict requiring reload
function assertS2OptimisticLockConflict(res, label = 'S2 Stale update optimistic lock') {
  assertNo500(res, label);
  if (res.status !== 409) {
    fail(`${label}: expected HTTP 409 Conflict on stale version update, got ${res.status} (${res.rawText?.slice(0, 200)})`, {
      status: res.status,
      data: res.data,
    });
  }
  if (res.data && res.data.success === true) {
    fail(`${label}: 409 response had success=true`, { data: res.data });
  }
}

// Scenario 3: Invalid ('abc', '1abc') or non-existent ('99999999999') ID must return 400/404
function assertS3InvalidIdRejected(res, label = 'S3 Invalid/Non-existent ID') {
  assertNo500(res, label);
  if (![400, 404].includes(res.status)) {
    fail(`${label}: expected HTTP 400/404 for invalid/non-existent ID, got ${res.status}`, {
      data: res.data,
    });
  }
}

// Scenario 4: Form / API validation error
function assertS4ValidationError(res, label = 'S4 Validation error') {
  assertNo500(res, label);
  if (![400, 422].includes(res.status)) {
    fail(`${label}: expected HTTP 400/422 validation error, got ${res.status}`, {
      data: res.data,
    });
  }
  if (res.data && res.data.success === true) {
    fail(`${label}: validation failure returned success=true`, { data: res.data });
  }
}

// Scenario 5: Large HTML paste exceeding text field limit must be rejected cleanly (not 500 or saved)
function assertS5HtmlOverflowRejected(res, label = 'S5 Large HTML overflow') {
  assertNo500(res, label);
  if (![400, 413, 422].includes(res.status)) {
    fail(`${label}: expected HTTP 400/413/422 length error on oversized HTML input, got ${res.status}`, {
      data: res.data,
    });
  }
}

// Scenario 6: Whitespace-only ('   ' or '\u3000\u3000\u3000') must be rejected as empty/required
function assertS6WhitespaceRejected(res, label = 'S6 Whitespace-only input') {
  assertNo500(res, label);
  if (![400, 422].includes(res.status)) {
    fail(`${label}: expected HTTP 400/422 for whitespace-only input, got ${res.status}`, {
      data: res.data,
    });
  }
}

// Scenario 7: Full-width digits ('０１２３４５６７８９') must not crash (500) or silently corrupt to 0/NaN
function assertS7FullWidthDigitsHandled(res, { allowNormalizedSuccess = true, expectedNumericValue = null, actualValue = null } = {}, label = 'S7 Full-width digits') {
  assertNo500(res, label);
  if (allowNormalizedSuccess && [200, 201].includes(res.status)) {
    if (expectedNumericValue !== null && actualValue !== null) {
      assert.strictEqual(
        Number(actualValue),
        Number(expectedNumericValue),
        `${label}: full-width digit value silently corrupted (expected ${expectedNumericValue}, got ${actualValue})`
      );
    }
    return;
  }
  if (![400, 422].includes(res.status)) {
    fail(`${label}: expected normalized success or 400/422 rejection, got ${res.status}`, { data: res.data });
  }
}

// Scenario 8: Invalid/unselected select-option rejected cleanly
function assertS8SelectOptionValidated(res, label = 'S8 Invalid select-option') {
  assertNo500(res, label);
  if (![400, 404, 422].includes(res.status)) {
    fail(`${label}: expected HTTP 400/404/422 for invalid option, got ${res.status}`, {
      data: res.data,
    });
  }
}

// Scenario 9: Rapid double-submit must not create duplicate rows
function assertS9NoDuplicateCreate(createdCount, expectedCount = 1, label = 'S9 Double-submit deduplication') {
  if (createdCount !== expectedCount) {
    fail(`${label}: expected exactly ${expectedCount} persisted record(s), found ${createdCount}`, {
      createdCount,
      expectedCount,
    });
  }
}

// Scenario 10: Invalid URL ?page=abc or ?page=99999 must show explicit error (API or UI)
function assertS10InvalidPageParamRejected(res, label = 'S10 Invalid URL page param') {
  assertNo500(res, label);
  if (![400, 404].includes(res.status)) {
    fail(`${label}: expected HTTP 400/404 for invalid/out-of-range page param, got ${res.status}`, {
      data: res.data,
    });
  }
}

// Scenario 11: Non-image upload (.pdf/.txt) must be rejected
function assertS11NonImageUploadRejected(res, label = 'S11 Non-image upload rejected') {
  assertNo500(res, label);
  if (![400, 415, 422].includes(res.status)) {
    fail(`${label}: expected HTTP 400/415/422 for non-image upload, got ${res.status}`, {
      data: res.data,
    });
  }
}

// Scenario 12: Broken image fallback verified via DOM image state or fallback element
function assertS12BrokenImageFallback(imageChecks, hasFallbackUi = false, label = 'S12 Broken image fallback') {
  if (!Array.isArray(imageChecks)) {
    fail(`${label}: invalid imageChecks array`);
  }
  const broken = imageChecks.filter((img) => !img.ok);
  if (broken.length > 0 && !hasFallbackUi) {
    fail(`${label}: found ${broken.length} broken <img> without working fallback`, { broken });
  }
}

// Scenario 13: Update without selecting a new image must preserve existing image
function assertS13ImagePreservedOnUpdate(beforeUrl, afterUrl, label = 'S13 Image preserved on update') {
  if (!beforeUrl || !afterUrl || beforeUrl !== afterUrl) {
    fail(`${label}: expected image URL to stay '${beforeUrl}', got '${afterUrl}'`, {
      beforeUrl,
      afterUrl,
    });
  }
}

// Scenario 14: Unauthenticated / unauthorized delete or protected action blocked
function assertS14UnauthBlocked(res, label = 'S14 Unauthenticated action blocked') {
  assertNo500(res, label);
  if (![401, 403].includes(res.status)) {
    fail(`${label}: expected HTTP 401/403 for unauthenticated/unauthorized request, got ${res.status}`, {
      data: res.data,
    });
  }
}

module.exports = {
  fail,
  assertStatus,
  assertNo500,
  assertErrorCode,
  assertS1DeleteConflict,
  assertS2OptimisticLockConflict,
  assertS3InvalidIdRejected,
  assertS4ValidationError,
  assertS5HtmlOverflowRejected,
  assertS6WhitespaceRejected,
  assertS7FullWidthDigitsHandled,
  assertS8SelectOptionValidated,
  assertS9NoDuplicateCreate,
  assertS10InvalidPageParamRejected,
  assertS11NonImageUploadRejected,
  assertS12BrokenImageFallback,
  assertS13ImagePreservedOnUpdate,
  assertS14UnauthBlocked,
};
