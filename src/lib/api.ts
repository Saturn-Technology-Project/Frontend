// The API client, split by area under ./api. Everything is re-exported here so callers keep
// importing from "@/lib/api".
export { ApiError } from "./api/transport";
export * from "./api/types";
export * from "./api/auth";
export * from "./api/payload-keys";
export * from "./api/org";
export * from "./api/console";
export * from "./api/mcp";
export * from "./api/policies";
export * from "./api/webhooks";
export * from "./api/status";
