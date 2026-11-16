# E2E QA 14-Scenario Verification Summary

- **Generated**: 2026-11-18T05:36:29.182Z
- **Mode**: `smoke` | **Tier**: `smoke`
- **Results**: PASS=0, FAIL=0, N/A=0, SKIP=0 (Total=0)

## Smoke Infrastructure Checks

| Check | Status | Details |
| :--- | :---: | :--- |
| MySQL Live Connection & Baseline Counts | **PASS** | Users=21, Roles=7, Services=16, ServiceCategories=6, Bookings=16, Stays=11 |
| Backend Live Health (:5000/api/health) | **PASS** | HTTP 200 (OK) |
| Frontend Live Dev Server (:3000) | **PASS** | HTTP 200 (len=1494) |
| WebSocket /ws/v1/dashboard | **PASS** | READY(seq=0) + PING/PONG(serverTime=2026-11-18T05:36:08.009Z) |
| All 7 Role API Logins + /auth/me + /auth/refresh | **PASS** | admin(roleId=1), receptionist(roleId=2), guest(roleId=5), kitchen(roleId=3), housekeeping(roleId=4), manager(roleId=6), staff(roleId=7) |
| Headless CDP Multi-Tab + Incognito Isolation + UI Login | **PASS** | Chrome/157.0.8103.51 \| ctxA(tabA1 roleId=1, tabA2 localStorage=true, rootLen=39648, imgs=0, apiReqs=25, consoleErrs=0, pageErrs=0) \| ctxB(incognito hotel_user=null) |
| Browser Process & Temp Profile Cleanup | **PASS** | Removed C:\Users\DANGVA~1\AppData\Local\Temp\e2e-cdp-1QGQdy |
| DB Fixture Seed & Reverse-FK Cleanup Round-Trip | **PASS** | Seeded Cat=7, Svc=17, Booking=21, Inv=5, KB=26; preClean=5 -> postClean=0; baseline counts intact |
