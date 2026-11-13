# TODO（Frontend）

2026-11-13 安全／效能／維運審查（#10）合併並部署後，留下來還沒做的事。依優先順序排列；每項都附上相關檔案，可以直接在本地 session 接手。

後端的待辦在 Saturn-MCP-Backend 的 `TODO.md`。

---

## 一、設定（需要 GitHub／GCP 權限）

- [ ] **替 `production` environment 加上保護規則。** 這個 environment 是 #10 第一次部署時自動建立的，目前沒有任何保護。請到 GitHub → Settings → Environments → `production`，照 Backend 的設定加上 required reviewers，並把 deployment branch 限定為 `main`。注意：合併到 `main` 目前會直接部署到正式環境，中間沒有人工核准。
- [ ] **把主控台的入口也收到 Cloudflare 後面。** 主控台的 `*.run.app` 會把 `/saturn-api` 代理到 API。做法同後端 `infra/gcp/README.md` 的「Restrict ingress to Cloudflare」，完成後在這個 repo 設定 `CLOUD_RUN_INGRESS=internal-and-cloud-load-balancing`。
- [ ] **在瀏覽器實際操作一次以下流程。** 這些畫面只有單元測試涵蓋，沒有在瀏覽器裡驗證過：
  - 「設定 → 內容加密」裡的「你的金鑰指紋」。核准者畫面上顯示的指紋必須和這裡一致。
  - 「個人資料」裡改密碼：改完重新登入後，金鑰應該直接可以用，不需要重新核准。
  - 「個人資料」裡改 Email，並在確認步驟輸入密碼：改完要能用新 Email 加原本的密碼登入。

---

## 二、功能缺陷

- [ ] **用 passkey 登入或剛註冊完時，成員金鑰不會解鎖。** 金鑰只存在記憶體裡，而 `src/app/login/page.tsx` 的 `onPasskey` 和 `src/app/register/page.tsx` 都沒有呼叫 `unlockMemberKey`。結果是重新整理後，加密紀錄一直打不開，也沒有任何畫面讓使用者解鎖。可以加一個輸入密碼解鎖的對話框，或在需要時才要求輸入密碼。
- [ ] **OAuth 彈出視窗保留了 `opener`。** `src/lib/mcp-authorize.ts` 開的視窗保留 opener，網站也沒有送 COOP 標頭，第三方的授權頁理論上可以把主控台分頁導到釣魚頁（未實測）。
- [ ] **邀請 token 和 email 放在網址的 query string。** `src/app/accept-invite/page.tsx` 這樣做，會讓它們被寫進存取紀錄。
- [ ] **`proxyTimeout` 比 Cloud Run 的時限長。** `next.config.ts` 設成 600 秒，但 Cloud Run 的 `--timeout` 是 300 秒，超過 300 秒的政策產生請求會先被 Cloud Run 切斷。

---

## 三、效能與程式整理

- [ ] **語系檔隨每個頁面一起載入。** `src/lib/i18n/messages.ts`（兩種語言，約 25 KB gzip）在首屏就會載入，改成依語系動態載入。
- [ ] **拆分過大的檔案。**
  - `src/components/policies/policy-builder.tsx` 的 `BuilderCanvas` 有 618 行、14 個 `useState`。
  - `src/lib/api.ts` 把傳輸層、型別和約 100 個 endpoint 混在一起。
- [ ] **清掉沒用到的東西。**
  - `NEXT_PUBLIC_LANDING_URL` 沒有被用到。
  - `DEPLOY.md` 還在描述已經不存在的 WebSocket。
  - `src/proxy.ts` 的 `connect-src` 把 API host 寫死在程式裡。
  - 執行期的 `API_URL` 沒有作用，因為 rewrite 的目的地在 build 時就已寫死。
- [ ] **無障礙。**
  - 有 29 處 `outline-none`，只有 5 處 `focus-visible`，鍵盤操作時看不到焦點。
  - 強制顯示的金鑰對話框沒有關閉按鈕。

---

## 四、套件

以下版本在 2026-11-13 時還在兩週冷卻期內，時間到了再升：

| 套件 | 版本 | 可升級日期 |
|---|---|---|
| next、eslint-config-next | 16.4.6 | 2026-11-23 |
| hash-wasm | 4.13 | 2026-11-21 |
| zustand | 5.1 | 2026-11-20 |
| tailwindcss、@tailwindcss/postcss | 4.3.5 | 2026-11-20 |
| @tanstack/react-query | 5.107 | 2026-11-20 |
| @xyflow/react | 12.12.1 | 2026-11-16 |
| lucide-react | 1.72 | 2026-11-25 |

- [ ] **升 hash-wasm 時，`tests/password.test.mjs` 裡的固定答案測試必須通過。** 輸出只要有任何改變，所有人都會無法登入，也打不開自己的金鑰。
- [ ] **大版本升級另外評估：** eslint 10、TypeScript 7、`@simplewebauthn/browser` 14。
- [ ] **Node 22 的維護期到 2027-04。** 要升到 Node 24 時，Dockerfile 的 base image digest 和 CI 的 `node-version` 要一起改。
