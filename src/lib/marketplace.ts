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
    mercury: "Mercury",
    ibkr: "IBKR",
    dukascopy: "Dukascopy",
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
