export const marketCategories = [
  "development",
  "productivity",
  "communication",
  "data",
  "finance",
  "security",
] as const;

export type MarketCategory = (typeof marketCategories)[number];

export type MarketEntry = {
  id: string;
  category: MarketCategory;
  featured?: boolean;
  endpoint: string;
  publisher: string;
  docs: string;
  auth: "token" | "optional";
  blurb: { en: string; zh: string };
  points: { en: string[]; zh: string[] };
};

export const marketCatalog: MarketEntry[] = [
  {
    id: "gmail",
    category: "communication",
    featured: true,
    endpoint: "https://gmailmcp.googleapis.com/mcp/v1",
    publisher: "Google",
    docs: "https://developers.google.com/workspace/guides/configure-mcp-servers",
    auth: "token",
    blurb: {
      en: "Search, read, and draft mail in Gmail.",
      zh: "搜尋、讀取並撰寫 Gmail。",
    },
    points: {
      en: ["Search and read messages", "Draft and compose mail", "Uses the Gmail access you approve"],
      zh: ["搜尋並讀取郵件", "撰寫草稿與新郵件", "使用你核准的 Gmail 權限"],
    },
  },
  {
    id: "google-calendar",
    category: "productivity",
    featured: true,
    endpoint: "https://calendarmcp.googleapis.com/mcp/v1",
    publisher: "Google",
    docs: "https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server",
    auth: "token",
    blurb: {
      en: "Events and availability in Google Calendar.",
      zh: "Google Calendar 的行程與空檔。",
    },
    points: {
      en: ["Look up calendars and events", "Check free and busy time", "Read events you can access"],
      zh: ["查看日曆與行程", "查詢有空與忙碌時段", "讀取你有權限的行程"],
    },
  },
  {
    id: "google-sheets",
    category: "productivity",
    endpoint: "https://sheetsmcp.googleapis.com/mcp/v1",
    publisher: "Google",
    docs: "https://developers.google.com/workspace/guides/configure-mcp-servers",
    auth: "token",
    blurb: {
      en: "Read and update values in Google Sheets.",
      zh: "讀取並更新 Google Sheets 的儲存格。",
    },
    points: {
      en: ["Read a range or the spreadsheet", "Update values and formulas", "Uses the Sheets access you approve"],
      zh: ["讀取範圍或整份試算表", "更新數值與公式", "使用你核准的 Sheets 權限"],
    },
  },
  {
    id: "google-docs",
    category: "productivity",
    endpoint: "https://docsmcp.googleapis.com/mcp/v1",
    publisher: "Google",
    docs: "https://developers.google.com/workspace/guides/configure-mcp-servers",
    auth: "token",
    blurb: {
      en: "Read and update Google Docs.",
      zh: "讀取並更新 Google Docs。",
    },
    points: {
      en: ["Read a document", "Update the document", "Uses the Docs access you approve"],
      zh: ["讀取文件", "更新文件", "使用你核准的 Docs 權限"],
    },
  },
  {
    id: "google-slides",
    category: "productivity",
    endpoint: "https://slidesmcp.googleapis.com/mcp/v1",
    publisher: "Google",
    docs: "https://developers.google.com/workspace/guides/configure-mcp-servers",
    auth: "token",
    blurb: {
      en: "Read and update Google Slides decks.",
      zh: "讀取並更新 Google Slides 簡報。",
    },
    points: {
      en: ["Read a presentation", "Update the deck", "Uses the Slides access you approve"],
      zh: ["讀取簡報", "更新簡報", "使用你核准的 Slides 權限"],
    },
  },
  {
    id: "google-drive",
    category: "productivity",
    endpoint: "https://drivemcp.googleapis.com/mcp/v1",
    publisher: "Google",
    docs: "https://developers.google.com/workspace/guides/configure-mcp-servers",
    auth: "token",
    blurb: {
      en: "Search, read, and upload files in Google Drive.",
      zh: "搜尋、讀取並上傳 Google Drive 的檔案。",
    },
    points: {
      en: ["Search and read files", "Upload and copy files", "Uses the Drive access you approve"],
      zh: ["搜尋並讀取檔案", "上傳與複製檔案", "使用你核准的 Drive 權限"],
    },
  },
  {
    id: "canva",
    category: "productivity",
    endpoint: "https://mcp.canva.com/mcp",
    publisher: "Canva",
    docs: "https://www.canva.dev/docs/mcp/",
    auth: "token",
    blurb: {
      en: "Create, edit, and export designs in Canva.",
      zh: "在 Canva 建立、編輯並匯出設計。",
    },
    points: {
      en: ["Create and edit designs", "Search the library and brand kits", "Export and comment"],
      zh: ["建立並編輯設計", "搜尋作品庫與品牌套件", "匯出並加上註解"],
    },
  },
  {
    id: "figma",
    category: "productivity",
    endpoint: "https://mcp.figma.com/mcp",
    publisher: "Figma",
    docs: "https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/",
    auth: "token",
    blurb: {
      en: "Design context from Figma files, including writes back to the canvas.",
      zh: "從 Figma 檔案取得設計內容，也可以寫回畫布。",
    },
    points: {
      en: ["Read design context from a file link", "Write content back to the canvas", "Sign-in stays on Figma"],
      zh: ["從檔案連結讀取設計內容", "把內容寫回畫布", "登入留在 Figma"],
    },
  },
  {
    id: "adobe",
    category: "productivity",
    endpoint: "https://adobe-creativity.adobe.io/mcp",
    publisher: "Adobe",
    docs: "https://developer.adobe.com/adobe-for-creativity/",
    auth: "token",
    blurb: {
      en: "Photoshop, Firefly, Express, and Stock through Adobe for creativity.",
      zh: "透過 Adobe for creativity 使用 Photoshop、Firefly、Express 與 Stock。",
    },
    points: {
      en: ["Edit photos and design assets", "Search Adobe Stock", "Sign-in stays on Adobe"],
      zh: ["編輯照片與設計素材", "搜尋 Adobe Stock", "登入留在 Adobe"],
    },
  },
  {
    id: "microsoft-365",
    category: "productivity",
    endpoint: "https://mcp.svc.cloud.microsoft/enterprise",
    publisher: "Microsoft",
    docs: "https://learn.microsoft.com/en-us/graph/mcp-server/overview",
    auth: "token",
    blurb: {
      en: "Read-only Microsoft Graph for your Entra tenant.",
      zh: "以唯讀方式查詢 Entra 租戶的 Microsoft Graph。",
    },
    points: {
      en: ["Look up users, groups, and devices", "Run read-only Graph queries", "Sign-in stays on Microsoft"],
      zh: ["查詢使用者、群組與裝置", "執行唯讀的 Graph 查詢", "登入留在 Microsoft"],
    },
  },
  {
    id: "shopify",
    category: "finance",
    endpoint: "",
    publisher: "Shopify",
    docs: "https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront",
    auth: "optional",
    blurb: {
      en: "A store’s cart and policies. Paste https://{shop}.myshopify.com/api/mcp.",
      zh: "商店的購物車與政策。貼上 https://{shop}.myshopify.com/api/mcp。",
    },
    points: {
      en: ["Read the cart and shop policies", "The URL is the store domain plus /api/mcp", "Storefront calls do not need a token"],
      zh: ["讀取購物車與商店政策", "網址是商店網域加上 /api/mcp", "店面呼叫不需要權杖"],
    },
  },
  {
    id: "etherfi",
    category: "finance",
    endpoint: "https://mcp.ether.fi/mcp",
    publisher: "ether.fi",
    docs: "https://help.ether.fi/en/articles/863434-how-do-i-connect-claude-chatgpt-or-another-ai-assistant-to-my-personal-account",
    auth: "token",
    blurb: {
      en: "Read balances, cards, and transactions from your ether.fi Cash account.",
      zh: "唯讀查詢 ether.fi Cash 帳戶的餘額、卡片與交易。",
    },
    points: {
      en: ["Review balances, holdings, and spending", "Read only the account data you approve", "Approve access on ether.fi with your passkey"],
      zh: ["查看餘額、持倉與支出", "僅讀取你核准的帳戶資料", "在 ether.fi 使用通行金鑰核准存取"],
    },
  },
  {
    id: "coinbase",
    category: "finance",
    endpoint: "https://agents.coinbase.com/mcp",
    publisher: "Coinbase",
    docs: "https://docs.cdp.coinbase.com/ai-agents/coinbase-for-agents/coinbase-mcp",
    auth: "token",
    blurb: {
      en: "Connect Coinbase trading and portfolios through its official MCP.",
      zh: "透過官方 MCP 連接 Coinbase 交易與投資組合。",
    },
    points: {
      en: ["Review balances, positions, and trading tools", "Choose portfolio access when signing in to Coinbase", "Connection availability depends on Coinbase client approval"],
      zh: ["查看餘額、部位與交易工具", "登入 Coinbase 時選擇投資組合存取權限", "能否連線取決於 Coinbase 的用戶端審核"],
    },
  },
  {
    id: "etherscan",
    category: "finance",
    endpoint: "https://mcp.etherscan.io/mcp",
    publisher: "Etherscan",
    docs: "https://docs.etherscan.io/build-with-ai/mcp",
    auth: "token",
    blurb: {
      en: "On-chain data across EVM chains. Paste an Etherscan API key.",
      zh: "跨 EVM 鏈的鏈上資料。貼上 Etherscan API 金鑰。",
    },
    points: {
      en: ["Read balances, transfers, and contracts", "The API key is the access token", "Calls stay read-only"],
      zh: ["讀取餘額、轉帳與合約", "API 金鑰就是存取權杖", "呼叫維持唯讀"],
    },
  },
  {
    id: "vercel",
    category: "development",
    endpoint: "https://mcp.vercel.com",
    publisher: "Vercel",
    docs: "https://vercel.com/docs/agent-resources/vercel-mcp",
    auth: "token",
    blurb: {
      en: "Projects, deployments, and logs on your Vercel account.",
      zh: "你的 Vercel 帳戶裡的專案、部署與紀錄。",
    },
    points: {
      en: ["Search Vercel documentation", "Review projects and deployments", "Read deployment logs"],
      zh: ["搜尋 Vercel 文件", "查看專案與部署", "讀取部署紀錄"],
    },
  },
  {
    id: "indeed",
    category: "productivity",
    endpoint: "https://mcp.indeed.com/claude/mcp",
    publisher: "Indeed",
    docs: "https://www.indeed.com",
    auth: "token",
    blurb: {
      en: "Job search, job details, and company data on Indeed.",
      zh: "在 Indeed 搜尋職缺、查看職缺內容與公司資料。",
    },
    points: {
      en: ["Search jobs", "Read a posting and company data", "Sign-in stays on Indeed"],
      zh: ["搜尋職缺", "讀取職缺與公司資料", "登入留在 Indeed"],
    },
  },
  {
    id: "spotify",
    category: "productivity",
    endpoint: "https://mcp-gateway-external-pilot.spotify.net/mcp",
    publisher: "Spotify",
    docs: "https://developer.spotify.com",
    auth: "token",
    blurb: {
      en: "Music and podcasts on the Spotify account you sign in to.",
      zh: "你登入的 Spotify 帳戶裡的音樂與 podcast。",
    },
    points: {
      en: ["Ask for songs, artists, and playlists", "Find podcasts", "Sign-in stays on Spotify"],
      zh: ["查詢歌曲、藝人與播放清單", "尋找 podcast", "登入留在 Spotify"],
    },
  },
  {
    id: "booking",
    category: "productivity",
    endpoint: "https://demandapi-mcp.booking.com/v1/sp/mcp/",
    publisher: "Booking.com",
    docs: "https://developers.booking.com/mcp-server/docs/get-started",
    auth: "token",
    blurb: {
      en: "Search stays with a Booking.com affiliate account.",
      zh: "用 Booking.com 聯盟帳戶搜尋住宿。",
    },
    points: {
      en: ["Search accommodations", "Send the affiliate ID and Demand API key as request headers", "A bearer token does not replace those headers"],
      zh: ["搜尋住宿", "用請求標頭送出聯盟編號與 Demand API 金鑰", "Bearer 權杖不能取代這兩個標頭"],
    },
  },
  {
    id: "sumsub",
    category: "security",
    endpoint: "https://api.sumsub.com/mcp/",
    publisher: "Sumsub",
    docs: "https://docs.sumsub.com/docs/mcp-server",
    auth: "token",
    blurb: {
      en: "Applicants, verification links, and transaction monitoring.",
      zh: "申請人、驗證連結與交易監控。",
    },
    points: {
      en: ["Create applicants and verification links", "Review status and monitoring hits", "Access follows your Sumsub role"],
      zh: ["建立申請人與驗證連結", "查看狀態與監控命中", "權限跟你的 Sumsub 角色一致"],
    },
  },
  {
    id: "mercury",
    category: "finance",
    endpoint: "https://mcp.mercury.com/mcp",
    publisher: "Mercury",
    docs: "https://docs.mercury.com/docs/connecting-mercury-mcp",
    auth: "token",
    blurb: {
      en: "Accounts, transactions, and payment requests.",
      zh: "帳戶、交易與付款申請。",
    },
    points: {
      en: ["Read accounts and transactions", "Request payments and internal transfers", "Payments still need approval in Mercury"],
      zh: ["讀取帳戶與交易", "提出付款與內部轉帳申請", "付款仍須在 Mercury 核准"],
    },
  },
  {
    id: "ibkr",
    category: "finance",
    endpoint: "https://api.ibkr.com/v1/api/mcp-public",
    publisher: "Interactive Brokers",
    docs: "https://www.ibkrguides.com/releasenotes/connector-v1.1.5.htm",
    auth: "token",
    blurb: {
      en: "The Interactive Brokers account you authorize.",
      zh: "你授權的 Interactive Brokers 帳戶。",
    },
    points: {
      en: ["Review the authorized account", "Research positions and the portfolio", "Sign-in stays on Interactive Brokers"],
      zh: ["查看已授權的帳戶", "研究部位與投資組合", "登入留在 Interactive Brokers"],
    },
  },
  {
    id: "dukascopy",
    category: "finance",
    endpoint: "https://mcp.dukascopy.com/mcp",
    publisher: "Dukascopy Bank",
    docs: "https://ai.dukascopy.com/",
    auth: "token",
    blurb: {
      en: "A JForex trading account, including orders.",
      zh: "JForex 交易帳戶，包含下單。",
    },
    points: {
      en: ["Review the connected account", "Place and manage orders", "Your password stays with Dukascopy"],
      zh: ["查看已連接的帳戶", "下單並管理委託", "密碼留在 Dukascopy"],
    },
  },
  {
    id: "northwest-ra",
    category: "finance",
    endpoint: "https://mcp.northwestregisteredagent.com",
    publisher: "Northwest Registered Agent",
    docs: "https://www.northwestregisteredagent.com/ai/mcp",
    auth: "token",
    blurb: {
      en: "Companies, filings, invoices, domains, and phone on your Northwest account.",
      zh: "Northwest 帳戶裡的公司、申報、發票、網域與電話。",
    },
    points: {
      en: ["Read companies, filings, and invoices", "Manage domains, email, and phone", "Sign-in stays on Northwest"],
      zh: ["讀取公司、申報與發票", "管理網域、電子郵件與電話", "登入留在 Northwest"],
    },
  },
  {
    id: "carta",
    category: "finance",
    endpoint: "https://mcp.app.carta.com/mcp",
    publisher: "Carta",
    docs: "https://docs.carta.com/api-platform/guides/guides/claude-mcp-setup",
    auth: "token",
    blurb: {
      en: "Cap tables, funds, and investor CRM.",
      zh: "股權表、基金與投資人 CRM。",
    },
    points: {
      en: ["Read ownership and valuations", "Review fund metrics", "Update CRM records your account can change"],
      zh: ["讀取持股與估值", "查看基金指標", "更新你的帳號可以修改的 CRM 紀錄"],
    },
  },
  {
    id: "twelve-data",
    category: "finance",
    endpoint: "https://mcp.twelvedata.com/mcp",
    publisher: "Twelve Data",
    docs: "https://github.com/twelvedata/mcp",
    auth: "token",
    blurb: {
      en: "Market quotes, history, and indicators.",
      zh: "市場行情、歷史資料與指標。",
    },
    points: {
      en: ["Read quotes and historical prices", "Look up technical indicators", "Sign-in stays on Twelve Data"],
      zh: ["讀取行情與歷史價格", "查詢技術指標", "登入留在 Twelve Data"],
    },
  },
  {
    id: "factset",
    category: "finance",
    endpoint: "https://mcp.factset.com/content/v1",
    publisher: "FactSet",
    docs: "https://developer.factset.com/mcp",
    auth: "token",
    blurb: {
      en: "Institutional data for research and portfolios.",
      zh: "用於研究與投資組合的機構資料。",
    },
    points: {
      en: ["Query licensed FactSet content", "Review portfolio and research data", "Access follows your FactSet license"],
      zh: ["查詢已授權的 FactSet 內容", "查看投資組合與研究資料", "能用的範圍跟你的 FactSet 授權一致"],
    },
  },
  {
    id: "financial-datasets",
    category: "finance",
    endpoint: "https://mcp.financialdatasets.ai/",
    publisher: "Financial Datasets",
    docs: "https://docs.financialdatasets.ai/mcp-server",
    auth: "token",
    blurb: {
      en: "Company financials and fundamentals.",
      zh: "公司財報與基本面。",
    },
    points: {
      en: ["Read income statements, balance sheets, and cash flow", "Look up prices and company news", "Sign-in stays on Financial Datasets"],
      zh: ["讀取損益表、資產負債表與現金流量表", "查詢價格與公司新聞", "登入留在 Financial Datasets"],
    },
  },
  {
    id: "sec-api",
    category: "finance",
    endpoint: "https://api.sec-api.io/mcp",
    publisher: "SEC-API.io",
    docs: "https://github.com/SEC-API-io/sec-edgar-mcp",
    auth: "token",
    blurb: {
      en: "EDGAR filings and company events. Paste the API key from sec-api.io.",
      zh: "EDGAR 申報與公司事件。貼上 sec-api.io 的 API 金鑰。",
    },
    points: {
      en: ["Search EDGAR filings back to 1993", "Read filing text, exhibits, and XBRL financials", "The API key is the access token"],
      zh: ["搜尋 1993 年以來的 EDGAR 申報", "閱讀申報本文、附件與 XBRL 財報", "API 金鑰就是存取權杖"],
    },
  },
  {
    id: "finance-foundation",
    category: "finance",
    endpoint: "https://finance.foundation/mcp",
    publisher: "Finance Foundation",
    docs: "https://finance.foundation/",
    auth: "optional",
    blurb: {
      en: "Open reference data for financial entities, identifiers, and relationships.",
      zh: "金融實體、識別碼與關係的開放參考資料。",
    },
    points: {
      en: ["Resolve tickers, LEI, ISIN, and FIGI", "Read companies, markets, and funds", "A token is optional"],
      zh: ["對照代碼、LEI、ISIN 與 FIGI", "讀取公司、市場與基金", "權杖可留空"],
    },
  },
  {
    id: "ramp",
    category: "finance",
    endpoint: "https://mcp.ramp.com/mcp",
    publisher: "Ramp",
    docs: "https://docs.ramp.com/developer-api/v1/ramp-mcp",
    auth: "token",
    blurb: {
      en: "Corporate cards, spend, and reimbursements.",
      zh: "企業卡、支出與報銷。",
    },
    points: {
      en: ["Review spend and card balances", "Look up transactions and reimbursements", "Sign-in stays on Ramp"],
      zh: ["查看支出與卡片餘額", "查詢交易與報銷", "登入留在 Ramp"],
    },
  },
  {
    id: "brex",
    category: "finance",
    endpoint: "https://api.brex.com/mcp",
    publisher: "Brex",
    docs: "https://developer.brex.com/docs/mcp",
    auth: "token",
    blurb: {
      en: "Corporate cards, users, and banking activity.",
      zh: "企業卡、使用者與銀行活動。",
    },
    points: {
      en: ["Review cards and users", "Read banking transactions", "Sign-in stays on Brex"],
      zh: ["查看卡片與使用者", "讀取銀行交易", "登入留在 Brex"],
    },
  },
  {
    id: "xero",
    category: "finance",
    endpoint: "https://mcp.xero.com/mcp",
    publisher: "Xero",
    docs: "https://github.com/XeroAPI/xero-mcp-server",
    auth: "token",
    blurb: {
      en: "Accounting, invoices, and the books in Xero.",
      zh: "Xero 裡的會計、發票與帳務。",
    },
    points: {
      en: ["Read invoices, contacts, and accounts", "Check profit, cash, and receivables", "Sign-in stays on Xero"],
      zh: ["讀取發票、聯絡人與會計科目", "查看損益、現金與應收", "登入留在 Xero"],
    },
  },
  {
    id: "seeking-alpha",
    category: "finance",
    endpoint: "https://seekingalpha.com/mcp",
    publisher: "Seeking Alpha",
    docs: "https://seekingalpha.com/mcp",
    auth: "token",
    blurb: {
      en: "Market quotes and historical data.",
      zh: "市場行情與歷史資料。",
    },
    points: {
      en: ["Read quotes and historical prices", "Research the symbols your account can access", "Sign-in stays on Seeking Alpha"],
      zh: ["讀取行情與歷史價格", "研究你的帳戶可以查看的標的", "登入留在 Seeking Alpha"],
    },
  },
  {
    id: "github",
    category: "development",
    featured: true,
    endpoint: "https://api.githubcopilot.com/mcp/",
    publisher: "GitHub",
    docs: "https://github.com/github/github-mcp-server",
    auth: "token",
    blurb: {
      en: "Repositories, issues, pull requests, and Actions.",
      zh: "儲存庫、議題、拉取請求與 Actions。",
    },
    points: {
      en: ["Read repositories and file contents", "Work with issues and pull requests", "Inspect GitHub Actions"],
      zh: ["讀取儲存庫與檔案", "處理議題與拉取請求", "查看 GitHub Actions"],
    },
  },
  {
    id: "notion",
    category: "productivity",
    featured: true,
    endpoint: "https://mcp.notion.com/mcp",
    publisher: "Notion",
    docs: "https://developers.notion.com/docs/mcp",
    auth: "token",
    blurb: {
      en: "Search and update Notion pages and databases.",
      zh: "搜尋並更新 Notion 頁面與資料庫。",
    },
    points: {
      en: ["Search pages and databases", "Read page content", "Create and update pages"],
      zh: ["搜尋頁面與資料庫", "讀取頁面內容", "建立並更新頁面"],
    },
  },
  {
    id: "linear",
    category: "development",
    endpoint: "https://mcp.linear.app/mcp",
    publisher: "Linear",
    docs: "https://linear.app/docs/mcp",
    auth: "token",
    blurb: {
      en: "Issues, projects, and comments in Linear.",
      zh: "Linear 的議題、專案與留言。",
    },
    points: {
      en: ["Find and update issues", "Read projects and teams", "Add comments"],
      zh: ["查找並更新議題", "讀取專案與團隊", "新增留言"],
    },
  },
  {
    id: "plaid",
    category: "finance",
    endpoint: "https://api.dashboard.plaid.com/mcp/",
    publisher: "Plaid",
    docs: "https://plaid.com/docs/resources/mcp/",
    auth: "token",
    blurb: {
      en: "Production Item diagnostics, Link conversion, and API usage. Paste a mcp:dashboard access token.",
      zh: "正式環境的 Item 診斷、Link 轉換與 API 用量。貼上 mcp:dashboard 存取權杖。",
    },
    points: {
      en: ["Debug Items and list teams", "Read Link conversion and product usage", "The access token expires in 15 minutes"],
      zh: ["診斷 Item 並列出團隊", "讀取 Link 轉換與產品用量", "存取權杖 15 分鐘後失效"],
    },
  },
  {
    id: "stripe",
    category: "finance",
    endpoint: "https://mcp.stripe.com",
    publisher: "Stripe",
    docs: "https://docs.stripe.com/mcp",
    auth: "token",
    blurb: {
      en: "Customers, payments, and subscriptions.",
      zh: "客戶、付款與訂閱。",
    },
    points: {
      en: ["Look up customers and payments", "Read subscriptions and invoices", "Search Stripe records"],
      zh: ["查詢客戶與付款", "讀取訂閱與發票", "搜尋 Stripe 紀錄"],
    },
  },
  {
    id: "jira",
    category: "development",
    endpoint: "https://mcp.atlassian.com/v1/sse",
    publisher: "Atlassian",
    docs: "https://support.atlassian.com/rovo/docs/getting-started-with-the-atlassian-remote-mcp-server/",
    auth: "token",
    blurb: {
      en: "Jira and Confluence through Atlassian’s remote MCP.",
      zh: "透過 Atlassian 的遠端 MCP 使用 Jira 與 Confluence。",
    },
    points: {
      en: ["Search Jira issues", "Read Confluence pages", "Update work you already have access to"],
      zh: ["搜尋 Jira 議題", "讀取 Confluence 頁面", "更新你已有權限的內容"],
    },
  },
  {
    id: "sentry",
    category: "security",
    endpoint: "https://mcp.sentry.dev/mcp",
    publisher: "Sentry",
    docs: "https://docs.sentry.io/product/sentry-mcp/",
    auth: "token",
    blurb: {
      en: "Inspect errors and issues in Sentry.",
      zh: "查看 Sentry 裡的錯誤與議題。",
    },
    points: {
      en: ["Search issues", "Read error events", "Inspect a project you can access"],
      zh: ["搜尋議題", "讀取錯誤事件", "查看你有權限的專案"],
    },
  },
  {
    id: "slack",
    category: "communication",
    endpoint: "",
    publisher: "Slack",
    docs: "https://docs.slack.dev/ai/slack-mcp-server/",
    auth: "token",
    blurb: {
      en: "Slack’s remote MCP. Paste the URL Slack gives you.",
      zh: "Slack 的遠端 MCP。貼上 Slack 提供的網址。",
    },
    points: {
      en: ["Read channels you can access", "Search messages", "The URL comes from Slack after you authorize"],
      zh: ["讀取你有權限的頻道", "搜尋訊息", "授權後向 Slack 取得網址"],
    },
  },
  {
    id: "context7",
    category: "development",
    endpoint: "https://mcp.context7.com/mcp",
    publisher: "Context7",
    docs: "https://github.com/upstash/context7",
    auth: "optional",
    blurb: {
      en: "Current documentation for libraries and frameworks.",
      zh: "函式庫與框架的最新文件。",
    },
    points: {
      en: ["Look up library docs", "Pull a current API reference", "A token is optional"],
      zh: ["查詢函式庫文件", "取得目前的 API 說明", "權杖可留空"],
    },
  },
  {
    id: "deepwiki",
    category: "development",
    endpoint: "https://mcp.deepwiki.com/mcp",
    publisher: "Cognition",
    docs: "https://docs.devin.ai/work-with-devin/deepwiki-mcp",
    auth: "optional",
    blurb: {
      en: "Questions about public GitHub repositories.",
      zh: "詢問公開的 GitHub 儲存庫。",
    },
    points: {
      en: ["Ask about a public repository", "Read the wiki DeepWiki generated", "A token is optional"],
      zh: ["詢問公開儲存庫", "閱讀 DeepWiki 產生的說明", "權杖可留空"],
    },
  },
  {
    id: "huggingface",
    category: "data",
    endpoint: "https://huggingface.co/mcp",
    publisher: "Hugging Face",
    docs: "https://huggingface.co/docs/hub/en/hf-mcp-server",
    auth: "optional",
    blurb: {
      en: "Models, datasets, and spaces on Hugging Face.",
      zh: "Hugging Face 上的模型、資料集與 Space。",
    },
    points: {
      en: ["Search models and datasets", "Read model cards", "A token is optional"],
      zh: ["搜尋模型與資料集", "閱讀模型說明", "權杖可留空"],
    },
  },
  {
    id: "neon",
    category: "data",
    endpoint: "https://mcp.neon.tech/mcp",
    publisher: "Neon",
    docs: "https://neon.tech/docs/ai/neon-mcp-server",
    auth: "token",
    blurb: {
      en: "Neon Postgres projects and databases.",
      zh: "Neon 的 Postgres 專案與資料庫。",
    },
    points: {
      en: ["List projects and branches", "Inspect a database you own", "Run the access Neon grants this token"],
      zh: ["列出專案與分支", "查看你擁有的資料庫", "執行這個權杖被允許的操作"],
    },
  },
  {
    id: "supabase",
    category: "data",
    endpoint: "https://mcp.supabase.com/mcp",
    publisher: "Supabase",
    docs: "https://supabase.com/docs/guides/getting-started/mcp",
    auth: "token",
    blurb: {
      en: "Supabase projects, tables, and SQL.",
      zh: "Supabase 專案、資料表與 SQL。",
    },
    points: {
      en: ["List projects", "Inspect tables", "Use the access this token has"],
      zh: ["列出專案", "查看資料表", "使用這個權杖擁有的權限"],
    },
  },
];

export function marketName(id: string) {
  const names: Record<string, string> = {
    gmail: "Gmail",
    "google-calendar": "Google Calendar",
    "google-sheets": "Google Sheets",
    "google-docs": "Google Docs",
    "google-slides": "Google Slides",
    "google-drive": "Google Drive",
    canva: "Canva",
    figma: "Figma",
    adobe: "Adobe",
    "microsoft-365": "Microsoft 365",
    shopify: "Shopify",
    etherfi: "ether.fi",
    coinbase: "Coinbase",
    etherscan: "Etherscan",
    vercel: "Vercel",
    indeed: "Indeed",
    spotify: "Spotify",
    booking: "Booking.com",
    sumsub: "Sumsub",
    mercury: "Mercury",
    ibkr: "IBKR",
    dukascopy: "Dukascopy",
    "northwest-ra": "Northwest RA",
    carta: "Carta",
    "twelve-data": "Twelve Data",
    factset: "FactSet",
    "financial-datasets": "Financial Datasets",
    "sec-api": "SEC-API.io",
    "finance-foundation": "Finance Foundation",
    ramp: "Ramp",
    brex: "Brex",
    xero: "Xero",
    "seeking-alpha": "Seeking Alpha",
    github: "GitHub",
    notion: "Notion",
    linear: "Linear",
    plaid: "Plaid",
    stripe: "Stripe",
    jira: "Jira",
    sentry: "Sentry",
    slack: "Slack",
    context7: "Context7",
    deepwiki: "DeepWiki",
    huggingface: "Hugging Face",
    neon: "Neon",
    supabase: "Supabase",
  };
  return names[id] ?? id;
}
