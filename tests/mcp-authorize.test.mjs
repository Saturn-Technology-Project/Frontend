import assert from "node:assert/strict";
import test from "node:test";

const { McpAuthorizeError, mcpOauthErrorText, mcpSignInCompleted } = await import("../src/lib/mcp-authorize.ts");

const wanted = { name: "Linear", endpoint: "https://mcp.linear.app/mcp" };
const server = (over = {}) => ({ name: "Linear", endpoint: "https://mcp.linear.app/mcp", has_authorization: true, secret_status: "ok", ...over });

test("a sign-in counts as done only when the API holds a working authorization for that server", () => {
  assert.equal(mcpSignInCompleted([server()], wanted), true);
  assert.equal(mcpSignInCompleted([], wanted), false);
  assert.equal(mcpSignInCompleted([server({ has_authorization: false })], wanted), false);
  assert.equal(mcpSignInCompleted([server({ has_authorization: undefined })], wanted), false);
  assert.equal(mcpSignInCompleted([server({ secret_status: "needs_reconnect" })], wanted), false);
  assert.equal(mcpSignInCompleted([server({ name: "Notion", endpoint: "https://mcp.notion.com/mcp" })], wanted), false);
});

test("the server is matched by name, or by endpoint when the API tidied the name", () => {
  assert.equal(mcpSignInCompleted([server({ name: " Linear " })], wanted), true);
  assert.equal(mcpSignInCompleted([server({ name: "Linear (2)", endpoint: "https://mcp.linear.app/mcp/" })], wanted), true);
  assert.equal(mcpSignInCompleted([server({ endpoint: "https://elsewhere.example/mcp" })], wanted), true);
});

test("each way a sign-in can fail has its own message", () => {
  const labels = { popup: "popup", signInUnavailable: "unavailable", incomplete: "incomplete" };
  assert.equal(mcpOauthErrorText(new McpAuthorizeError("popup", "popup"), labels), "popup");
  assert.equal(mcpOauthErrorText(new McpAuthorizeError("incomplete", "incomplete"), labels), "incomplete");
  assert.equal(mcpOauthErrorText(new McpAuthorizeError("The MCP provider did not grant access.", "denied"), labels), "The MCP provider did not grant access.");
  assert.equal(mcpOauthErrorText(new Error("This MCP does not let Saturn start sign-in"), labels), "unavailable");
  assert.equal(mcpOauthErrorText("not an error", labels), "popup");
});
