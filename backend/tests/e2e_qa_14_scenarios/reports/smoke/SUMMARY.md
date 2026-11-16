# E2E QA 14-Scenario Verification Summary

- **Generated**: 2026-11-18T06:12:22.017Z
- **Mode**: `smoke` | **Tier**: `smoke`
- **Results**: PASS=0, FAIL=0, N/A=0, SKIP=0 (Total=0)

## Smoke Infrastructure Checks

| Check | Status | Details |
| :--- | :---: | :--- |
| MySQL Live Connection & Baseline Counts | **PASS** | Users=21, Roles=7, Services=18, ServiceCategories=8, Bookings=16, Stays=11 |
| Backend Live Health (:5000/api/health) | **PASS** | HTTP 200 (OK) |
| Frontend Live Dev Server (:3000) | **PASS** | HTTP 200 (len=1494) |
| WebSocket /ws/v1/dashboard | **PASS** | READY(seq=0) + PING/PONG(serverTime=2026-11-18T06:12:04.569Z) |
| All 7 Role API Logins + /auth/me + /auth/refresh | **PASS** | admin(roleId=1), receptionist(roleId=2), guest(roleId=5), kitchen(roleId=3), housekeeping(roleId=4), manager(roleId=6), staff(roleId=7) |
| Headless CDP Multi-Tab + Incognito Isolation + UI Login | **PASS** | Chrome/157.0.8103.51 \| ctxA(tabA1 roleId=1, tabA2 localStorage=true, rootLen=39739, imgs=0, apiReqs=24, consoleErrs=0, pageErrs=0) \| ctxB(incognito hotel_user=null) |
| Browser Process & Temp Profile Cleanup | **PASS** | Removed C:\Users\DANGVA~1\AppData\Local\Temp\e2e-cdp-JuyCL8 |
| DB Fixture Seed & Reverse-FK Cleanup Round-Trip | **PASS** | Seeded Cat=19, Svc=28, Booking=26, Inv=11, KB=31; preClean=5 -> postClean=0; baseline counts intact |
