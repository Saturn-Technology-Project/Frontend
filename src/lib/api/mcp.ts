import { del, get, patch, post } from "./transport";

export function deleteMcpServer(id: string) {
  return del(`/mcp-servers/${id}`);
}

export interface ApiMcpServer {
  id: string;
  name: string;
  endpoint: string;
  status: string;
  connected?: boolean;
  gateway?: string;
  organization_id?: string | null;
  tools: string[];
  catalog?: { id: string; name: string; description?: string }[];
  has_authorization?: boolean;
  secret_status?: "ok" | "needs_reconnect" | "none";
}

export interface ApiToolSetItem {
  tool_id: string;
  name: string;
  description?: string;
  server_id?: string | null;
  server_name?: string;
  approval?: boolean;
  input_schema?: Record<string, unknown>;
}

export interface ApiToolSet {
  id: string;
  name: string;
  description?: string;
  items: ApiToolSetItem[];
}

export function fetchMcpServers() {
  return get<ApiMcpServer[]>("/mcp-servers");
}

export function connectMcpServer(body: { name: string; endpoint: string; authorization?: string }) {
  return post<ApiMcpServer>("/mcp-servers", body);
}

export function startMcpOauth(body: { name: string; endpoint: string; nonce: string }) {
  return post<{ authorization_url?: string | null; server?: ApiMcpServer | null }>("/mcp-servers/oauth/start", body);
}

export function refreshMcpServer(id: string) {
  return post<ApiMcpServer>(`/mcp-servers/${id}/refresh`);
}

export function createToolSet(body: {
  name: string;
  description?: string;
  items: { tool_id: string; approval: boolean }[];
}) {
  return post<ApiToolSet>("/tool-sets", body);
}

export function updateToolSet(
  id: string,
  body: {
    name?: string;
    description?: string;
    items?: { tool_id: string; approval: boolean }[];
  }
) {
  return patch<ApiToolSet>(`/tool-sets/${id}`, body);
}

export function deleteToolSet(id: string) {
  return del(`/tool-sets/${id}`);
}
