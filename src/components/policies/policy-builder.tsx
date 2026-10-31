"use client";

import { DragEvent, createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDeletePolicy, useUpdatePolicy } from "@/hooks/use-console";
import { PolicyProgressBar, applyProgress, type PolicyProgress } from "@/components/policies/policy-thinking";
import { ApiError, activatePolicy, createApprovalPolicy, fetchApprovalPolicies, fetchGroups, simulatePolicy, streamPolicy, updateApprovalPolicy, validatePolicy, type ApprovalPolicyRecord, type PolicyDiff, type PolicyReview, type PolicyValidation } from "@/lib/api";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useI18n } from "@/lib/i18n";
import { POLICY_OPERATORS } from "@/lib/policy";
import { PolicyForm } from "@/components/policies/policy-form";
import { approvalSummary, blankData, definitionFromRules, newNode, toDefinition, toFlow, type FlowData, type FlowNode, type NodeApprovalRequirement } from "@/lib/policy-graph";
import { cn } from "@/lib/utils";
import type { Agent, Policy, PolicyDefinition, PolicyNodeKind, ToolSet, ToolSetItem } from "@/types";

const kinds: PolicyNodeKind[] = ["subject", "tool", "condition", "logic", "decision", "enforcement"];
const AgentContext = createContext<Agent[]>([]);

const inputClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

function nodeTitle(data: FlowData, agents: Agent[], t: (path: string) => string) {
  if (data.kind === "subject") {
    const names = (data.agentIds ?? []).map((id) => agents.find((agent) => agent.id === id)?.name ?? id);
    return names.length ? names.join(", ") : t("policies.anyAgent");
  }
  if (data.kind === "tool") return data.tool || t("policies.capability");
  if (data.kind === "condition") {
    return [data.field, data.operator, data.value].filter((item) => item !== "" && item != null).join(" ") || t("policies.condition");
  }
  if (data.kind === "logic") return (data.op ?? "and").toUpperCase();
  if (data.kind === "decision") {
    if (data.decision === "allow") return t("policies.action.allow");
    if (data.decision === "approval") return t("policies.action.approval");
    return t("policies.action.deny");
  }
  return data.rateLimit ? `${t("policies.rateLimit")} ${data.rateLimit}` : t("policies.enforcement");
}

function PolicyNodeView({ data, selected }: NodeProps<FlowNode>) {
  const { t } = useI18n();
  const agents = useContext(AgentContext);
  const title = nodeTitle(data, agents, t);
  const composed = data.kind === "decision" ? approvalSummary(data) : "";
  return (
    <div className={cn("min-w-[168px] rounded-md border bg-card px-3 py-2 shadow-sm", selected ? "border-foreground" : "border-border")}>
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-foreground" />
      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{t(`policies.kind.${data.kind}`)}</div>
      <div className={cn("mt-1 text-[13px] font-medium", data.kind === "decision" && data.decision === "deny" && "text-destructive")}>
        {title}
      </div>
      {composed ? <div className="mt-1 text-[12px] text-muted-foreground">{composed}</div> : null}
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-foreground" />
    </div>
  );
}

const nodeTypes = { policy: PolicyNodeView };

export function PolicyBuilder({
  policy,
  agents,
  toolSets,
  canWrite,
}: {
  policy: Policy;
  agents: Agent[];
  toolSets: ToolSet[];
  canWrite: boolean;
}) {
  const initial = policy.definition?.nodes?.length ? policy.definition : definitionFromRules(policy.rules);
  const flow = toFlow(initial);
  return (
    <ReactFlowProvider>
      <BuilderCanvas
        policy={policy}
        agents={agents}
        toolSets={toolSets}
        canWrite={canWrite}
        initialNodes={flow.nodes}
        initialEdges={flow.edges}
        converted={!policy.definition?.nodes?.length && policy.rules.length > 0}
      />
    </ReactFlowProvider>
  );
}

function BuilderCanvas({
  policy,
  agents,
  toolSets,
  canWrite,
  initialNodes,
  initialEdges,
  converted,
}: {
  policy: Policy;
  agents: Agent[];
  toolSets: ToolSet[];
  canWrite: boolean;
  initialNodes: FlowNode[];
  initialEdges: Edge[];
  converted: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const update = useUpdatePolicy();
  const remove = useDeletePolicy();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [askOptimize, setAskOptimize] = useState(false);
  const [optimizeInstructions, setOptimizeInstructions] = useState("");
  const [progress, setProgress] = useState<PolicyProgress | null>(null);
  const flow = useReactFlow<FlowNode, Edge>();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { groups: groupAccess } = useEntitlements();
  const approvalPolicies = useQuery({
    queryKey: ["approval-policies"],
    queryFn: fetchApprovalPolicies,
    enabled: groupAccess,
  });
  useEffect(() => {
    const policies = approvalPolicies.data;
    if (!policies) return;
    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        if (node.data.kind !== "decision" || node.data.decision !== "approval") return node;
        if (node.data.approvalRequirements || !node.data.approvalPolicyId) return node;
        const policy = policies.find((item) => item.id === node.data.approvalPolicyId);
        if (!policy) return node;
        changed = true;
        return { ...node, data: { ...node.data, ...draftFromPolicy(policy) } };
      });
      return changed ? next : current;
    });
  }, [approvalPolicies.data, setNodes]);
  const [name, setName] = useState(policy.name);
  const [setId, setSetId] = useState(policy.toolSetId ?? policy.definition?.toolSetId ?? "");
  const [status, setStatus] = useState(policy.status);
  const [version, setVersion] = useState(policy.version);
  const [selected, setSelected] = useState<string | null>(null);
  const [report, setReport] = useState<PolicyValidation | null>(null);
  const [panel, setPanel] = useState<"validation" | "test" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"save" | "validate" | "activate" | "test" | "optimize" | null>(null);
  const [confirmRisk, setConfirmRisk] = useState(false);
  const [testTool, setTestTool] = useState("");
  const [testArgs, setTestArgs] = useState("{}");
  const [testResult, setTestResult] = useState("");
  const [view, setView] = useState<"canvas" | "json" | "form">("canvas");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [proposal, setProposal] = useState<{ definition: PolicyDefinition; diff: PolicyDiff[]; json: string } | null>(null);
  const analyses = policy.definition?.analyses ?? [];
  const unconfigured = analyses.length > 0 && analyses.every((item) => item.status !== "analyzed");
  const current = nodes.find((node) => node.id === selected) ?? null;
  const setTools = useMemo(() => toolSets.find((item) => item.id === setId)?.items ?? [], [toolSets, setId]);
  const toolGroups = useMemo(() => groupByServer(setTools), [setTools]);
  const schemas = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const set of toolSets) {
      for (const item of set.items) {
        if (item.inputSchema) map.set(item.name, item.inputSchema);
      }
    }
    for (const item of setTools) {
      if (item.inputSchema) map.set(item.name, item.inputSchema);
    }
    return map;
  }, [toolSets, setTools]);
  const conditionTools = current?.data.kind === "condition" ? connectedToolNames(current.id, nodes, edges) : [];
  const conditionFields = conditionTools.flatMap((name) =>
    schemaFields(schemas.get(name)).map((field) => ({ ...field, tool: name }))
  );
  const toolNames = useMemo(() => {
    const fromNodes = nodes.flatMap((node) => (node.data.kind === "tool" && node.data.tool ? [node.data.tool] : []));
    const fromSet = setTools.map((item) => item.name);
    return Array.from(new Set([...fromSet, ...fromNodes]));
  }, [nodes, setTools]);

  function updateNode(id: string, patch: Partial<FlowData>) {
    setNodes((currentNodes) =>
      currentNodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node))
    );
  }

  function onDragStart(event: DragEvent, kind: PolicyNodeKind) {
    event.dataTransfer.setData("application/saturn-node", kind);
    event.dataTransfer.effectAllowed = "move";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/saturn-node");
    if (!isNodeKind(kind) || !canWrite) return;
    const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setNodes((currentNodes) => currentNodes.concat(newNode(kind, position)));
  }

  function canvasDefinition() {
    return toDefinition(nodes, edges, analyses, setId || null);
  }

  function readJson(text: string): PolicyDefinition {
    const parsed = JSON.parse(text) as PolicyDefinition;
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      throw new SyntaxError("policy");
    }
    return parsed;
  }

  function applyGraph(definition: PolicyDefinition) {
    const flow = toFlow(definition);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setJsonText(JSON.stringify(definition, null, 2));
  }

  function editorDefinition() {
    return view === "json" ? readJson(jsonText) : canvasDefinition();
  }

  async function persist() {
    const definition = await syncNodeApprovals(editorDefinition(), name, groupAccess, t("policies.approvalIncomplete"));
    applyGraph(definition);
    const saved = await update.mutateAsync({
      id: policy.id,
      body: {
        name: name.trim() || policy.name,
        description: policy.description,
        tool_set_id: setId || null,
        definition,
      },
    });
    setStatus(saved.status === "validated" || saved.status === "paused" || saved.status === "draft" ? saved.status : "active");
    setVersion(saved.version ?? version);
    setConfirmRisk(false);
    return saved;
  }

  async function onSave() {
    setBusy("save");
    setError("");
    try {
      await persist();
    } catch (caught) {
      setError(caught instanceof SyntaxError ? t("policies.jsonInvalid") : caught instanceof ApiError ? caught.message : t("policies.saveFailed"));
    } finally {
      setBusy(null);
    }
  }

  function cycleView() {
    if (view === "canvas") {
      setJsonError("");
      setJsonText(JSON.stringify(canvasDefinition(), null, 2));
      setView("json");
      return;
    }
    if (view === "json") {
      try {
        applyGraph(readJson(jsonText));
        setJsonError("");
        setView("form");
      } catch {
        setJsonError(t("policies.jsonInvalid"));
      }
      return;
    }
    setView("canvas");
  }

  async function onOptimize() {
    setBusy("optimize");
    setProgress({ label: t("policies.optimizing"), done: 0, total: 0, indeterminate: true, note: "" });
    setError("");
    setJsonError("");
    try {
      const definition = editorDefinition();
      if (view !== "json") {
        setJsonText(JSON.stringify(definition, null, 2));
        setView("json");
      }
      const result = await streamPolicy(
        `/policies/${policy.id}/optimize/stream`,
        { definition, instructions: optimizeInstructions },
        (event) => setProgress((current) => applyProgress(current, event, t))
      );
      if (!result.definition || !result.diff) throw new Error("policy");
      setAskOptimize(false);
      setProgress(null);
      setProposal({
        definition: result.definition,
        diff: result.diff,
        json: JSON.stringify(result.definition, null, 2),
      });
    } catch (caught) {
      setProgress(null);
      setError(caught instanceof SyntaxError ? t("policies.jsonInvalid") : caught instanceof ApiError ? caught.message : t("policies.saveFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function onValidate() {
    setBusy("validate");
    setError("");
    setPanel("validation");
    try {
      await persist();
      const result = await validatePolicy(policy.id);
      setReport(result.report);
      const next = result.policy.status;
      setStatus(next === "validated" || next === "draft" || next === "paused" || next === "active" ? next : status);
      setVersion(result.policy.version ?? version);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("policies.saveFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function onActivate() {
    setBusy("activate");
    setError("");
    try {
      await persist();
      const result = await validatePolicy(policy.id);
      setReport(result.report);
      setPanel("validation");
      if (!result.report.ok) return;
      const review = result.report.review;
      if (!confirmRisk && review && (review.allows.length > 0 || review.flagged_tools.length > 0)) {
        // Show what will be enforced first; the second click activates.
        setConfirmRisk(true);
        return;
      }
      const saved = await activatePolicy(policy.id, confirmRisk);
      setStatus("active");
      setVersion(saved.version ?? version);
      setConfirmRisk(false);
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : t("policies.saveFailed");
      if (caught instanceof ApiError && caught.status === 409) {
        setConfirmRisk(true);
        setPanel("validation");
      }
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function onTest() {
    setBusy("test");
    setError("");
    setTestResult("");
    try {
      const args = testArgs.trim() ? (JSON.parse(testArgs) as Record<string, unknown>) : {};
      if (!testTool) return;
      await persist();
      const result = await simulatePolicy(policy.id, testTool, args);
      setTestResult(`${result.decision}${result.reason ? ` — ${result.reason}` : ""}`);
    } catch (caught) {
      setError(caught instanceof SyntaxError ? t("policies.badJson") : caught instanceof ApiError ? caught.message : t("policies.saveFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AgentContext.Provider value={agents}>
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <input
          value={name}
          disabled={!canWrite}
          onChange={(event) => setName(event.target.value)}
          className="h-9 min-w-[180px] flex-1 rounded-md border border-border bg-background px-3 text-[14px] font-medium outline-none focus:border-ring"
          aria-label={t("policies.name")}
        />
        <select
          value={setId}
          disabled={!canWrite}
          onChange={(event) => setSetId(event.target.value)}
          className="h-9 max-w-[220px] rounded-md border border-border bg-background px-2 text-[13px]"
          aria-label={t("policies.capabilitySet")}
        >
          <option value="">{t("policies.noSetSelected")}</option>
          {toolSets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <span className="text-[12px] text-muted-foreground">
          {t(`policies.${status === "validated" ? "validated" : status === "draft" ? "draft" : status === "paused" ? "paused" : "active"}`)}
          {" · "}
          {t("policies.version", { n: version })}
        </span>
        {canWrite ? (
          <>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={cycleView}>
              {view === "canvas" ? t("policies.json") : view === "json" ? t("policies.form") : t("policies.canvas")}
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => setAskOptimize((open) => !open)}>
              {busy === "optimize" ? t("policies.optimizing") : t("policies.optimize")}
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void onSave()}>
              {busy === "save" ? t("policies.saving") : t("policies.save")}
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void onValidate()}>
              {busy === "validate" ? t("policies.validating") : t("policies.validate")}
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => setPanel(panel === "test" ? null : "test")}>
              {t("policies.test")}
            </Button>
            <Button type="button" disabled={busy !== null} onClick={() => void onActivate()}>
              {busy === "activate" ? t("policies.activating") : confirmRisk ? t("policies.confirmActivate") : t("policies.activate")}
            </Button>
            {confirmingDelete ? (
              <>
                <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)}>
                  {t("policies.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(policy.id, { onSuccess: () => router.push("/policies") })}
                >
                  {t("policies.confirmDelete")}
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" disabled={busy !== null || remove.isPending} onClick={() => setConfirmingDelete(true)}>
                {t("policies.deletePolicy")}
              </Button>
            )}
          </>
        ) : null}
      </header>
      {askOptimize ? (
        <form
          className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void onOptimize();
          }}
        >
          <label className="min-w-0 flex-1 text-[13px]">
            {t("policies.instructions")}
            <textarea
              value={optimizeInstructions}
              onChange={(event) => setOptimizeInstructions(event.target.value)}
              placeholder={t("policies.instructionsPlaceholder")}
              rows={3}
              className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-ring"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy !== null}>
              {busy === "optimize" ? t("policies.optimizing") : t("policies.sendToAi")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAskOptimize(false)}>
              {t("policies.cancel")}
            </Button>
          </div>
        </form>
      ) : null}
      {progress ? (
        <div className="border-b border-border px-4 py-3">
          <PolicyProgressBar progress={progress} />
        </div>
      ) : null}
      {unconfigured ? <p className="border-b border-border px-4 py-2 text-[13px] text-muted-foreground">{t("policies.unconfigured")}</p> : null}
      {converted ? <p className="border-b border-border px-4 py-2 text-[13px] text-muted-foreground">{t("policies.convertNote")}</p> : null}
      {error || remove.isError ? (
        <p className="border-b border-border px-4 py-2 text-[13px] text-destructive">
          {error || (remove.error instanceof Error ? remove.error.message : t("policies.saveFailed"))}
        </p>
      ) : null}
      {jsonError ? <p className="border-b border-border px-4 py-2 text-[13px] text-destructive">{jsonError}</p> : null}
      <div className="flex min-h-0 flex-1">
        {view === "canvas" ? (
        <aside className="hidden w-[220px] shrink-0 overflow-y-auto border-r border-border p-3 md:block">
          <h2 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("policies.library")}</h2>
          <div className="mt-2 grid gap-1.5">
            {kinds.map((kind) => (
              <button
                key={kind}
                type="button"
                draggable={canWrite}
                onDragStart={(event) => onDragStart(event, kind)}
                onClick={() => canWrite && setNodes((currentNodes) => currentNodes.concat(newNode(kind, { x: 80, y: 80 + currentNodes.length * 24 })))}
                className="rounded-md border border-border px-2 py-2 text-left text-[13px] hover:bg-muted"
              >
                {t(`policies.kind.${kind}`)}
              </button>
            ))}
          </div>
          <h2 className="mt-6 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("policies.inventory")}</h2>
          <div className="mt-3 space-y-4">
            {(toolGroups.length ? toolGroups : [{ id: "canvas", name: "", tools: toolNames.map((name) => ({ name })) }]).map((group) => (
              <section key={group.id}>
                {toolGroups.length ? (
                  <h3 className="truncate px-2 text-[11px] font-medium tracking-wide text-muted-foreground">
                    {group.name || t("policies.otherServer")}
                  </h3>
                ) : null}
                <div className={cn("grid gap-0.5", group.name && "mt-1")}>
                  {group.tools.map((item) => {
                    const analysis = analyses.find((entry) => entry.tool === item.name);
                    return (
                      <button
                        key={item.name}
                        type="button"
                        disabled={!canWrite}
                        onClick={() =>
                          setNodes((currentNodes) =>
                            currentNodes.concat({
                              ...newNode("tool", { x: 40, y: 40 + currentNodes.length * 20 }),
                              data: {
                                ...blankData("tool"),
                                tool: item.name,
                                classification: analysis
                                  ? {
                                      status: analysis.status,
                                      operation: analysis.operation,
                                      resource: analysis.resource,
                                      risk: analysis.risk,
                                      sideEffects: analysis.sideEffects,
                                      rationale: analysis.rationale,
                                    }
                                  : undefined,
                              },
                            })
                          )
                        }
                        className="truncate rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-muted"
                      >
                        <span className="font-mono">{item.name}</span>
                        {analysis && analysis.status !== "analyzed" ? (
                          <span className="mt-0.5 block text-muted-foreground">{t("policies.notAnalyzed")}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </aside>
        ) : null}
        <div className="flex min-w-0 flex-1" onDragOver={(event) => event.preventDefault()} onDrop={view === "canvas" ? onDrop : undefined}>
          {view === "json" ? (
            <div className={cn("grid min-h-0 min-w-0 flex-1", proposal && "md:grid-cols-2")}>
              <textarea
                value={jsonText}
                disabled={!canWrite}
                spellCheck={false}
                onChange={(event) => {
                  setJsonText(event.target.value);
                  setJsonError("");
                  setProposal(null);
                }}
                className="h-full min-h-0 resize-none bg-background p-4 font-mono text-[12px] leading-5 text-foreground outline-none"
                aria-label={t("policies.json")}
              />
              {proposal ? (
                <div className="flex min-h-0 flex-col border-l border-border">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
                    <h2 className="text-[13px] font-medium">{t("policies.changes")}</h2>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => {
                          applyGraph(proposal.definition);
                          setProposal(null);
                          setView("json");
                        }}
                      >
                        {t("policies.applyOptimized")}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setProposal(null)}>
                        {t("policies.discardOptimized")}
                      </Button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
                    {proposal.diff.length === 0 ? (
                      <p className="text-[13px] text-muted-foreground">{t("policies.noChanges")}</p>
                    ) : (
                      <ul className="space-y-3">
                        {proposal.diff.map((change) => (
                          <li key={`${change.kind}-${change.path}`} className="text-[13px]">
                            <div className="font-medium">{change.summary}</div>
                            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{change.path}</div>
                            <div className="mt-1 grid gap-2 md:grid-cols-2">
                              <pre className="overflow-auto rounded-md bg-muted p-2 font-mono text-[11px]">{JSON.stringify(change.before, null, 2)}</pre>
                              <pre className="overflow-auto rounded-md bg-muted p-2 font-mono text-[11px]">{JSON.stringify(change.after, null, 2)}</pre>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <h2 className="mt-6 text-[13px] font-medium">{t("policies.optimized")}</h2>
                    <pre className="mt-2 overflow-auto font-mono text-[12px] leading-5">{proposal.json}</pre>
                  </div>
                </div>
              ) : null}
            </div>
          ) : view === "form" ? (
            <PolicyForm nodes={nodes} edges={edges} disabled={!canWrite} onChange={updateNode} />
          ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(connection: Connection) => {
              if (!canWrite) return;
              setEdges((currentEdges) => addEdge({ ...connection, id: `edge_${crypto.randomUUID().slice(0, 8)}` }, currentEdges));
            }}
            onSelectionChange={({ nodes: selectedNodes }) => setSelected(selectedNodes[0]?.id ?? null)}
            nodeTypes={nodeTypes}
            fitView
            colorMode={resolvedTheme === "dark" ? "dark" : "light"}
            deleteKeyCode={canWrite ? ["Backspace", "Delete"] : null}
            nodesDraggable={canWrite}
            nodesConnectable={canWrite}
            elementsSelectable
            className="min-w-0 flex-1"
          >
            <Background gap={18} />
            <Controls showInteractive={false} />
          </ReactFlow>
          )}
        </div>
        {view === "canvas" ? (
        <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-border p-4 md:block">
          <h2 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("policies.properties")}</h2>
          {current ? (
            <NodeInspector
              node={current}
              agents={agents}
              tools={toolNames}
              groups={toolGroups}
              fields={conditionFields}
              hasTool={conditionTools.length > 0}
              disabled={!canWrite}
              onChange={(patch) => updateNode(current.id, patch)}
              onDuplicate={() =>
                setNodes((currentNodes) =>
                  currentNodes.concat({
                    ...current,
                    id: `${current.data.kind}_${crypto.randomUUID().slice(0, 8)}`,
                    position: { x: current.position.x + 32, y: current.position.y + 32 },
                    selected: false,
                  })
                )
              }
              onDelete={() => {
                setNodes((currentNodes) => currentNodes.filter((node) => node.id !== current.id));
                setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== current.id && edge.target !== current.id));
                setSelected(null);
              }}
            />
          ) : (
            <p className="mt-3 text-[13px] text-muted-foreground">{t("policies.noSelection")}</p>
          )}
        </aside>
        ) : null}
      </div>
      {panel ? (
        <section className="max-h-[220px] overflow-y-auto border-t border-border px-4 py-3">
          {panel === "validation" ? <ValidationReport report={report} /> : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[13px]">
                {t("policies.capability")}
                <select value={testTool} onChange={(event) => setTestTool(event.target.value)} className={inputClass}>
                  <option value="">{t("policies.capability")}</option>
                  <ToolOptions names={toolNames} groups={toolGroups} />
                </select>
              </label>
              <label className="min-w-[240px] flex-1 text-[13px]">
                {t("policies.arguments")}
                <input value={testArgs} onChange={(event) => setTestArgs(event.target.value)} className={cn(inputClass, "font-mono")} />
              </label>
              <Button type="button" disabled={busy !== null || !testTool} onClick={() => void onTest()}>
                {busy === "test" ? t("policies.validating") : t("policies.runTest")}
              </Button>
              {testResult ? <p className="w-full text-[13px]">{testResult}</p> : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
    </AgentContext.Provider>
  );
}

function isNodeKind(value: string): value is PolicyNodeKind {
  return kinds.includes(value as PolicyNodeKind);
}

function NodeInspector({
  node,
  agents,
  tools,
  groups,
  fields,
  hasTool,
  disabled,
  onChange,
  onDuplicate,
  onDelete,
}: {
  node: FlowNode;
  agents: Agent[];
  tools: string[];
  groups: ToolGroup[];
  fields: SchemaField[];
  hasTool: boolean;
  disabled: boolean;
  onChange: (patch: Partial<FlowData>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const data = node.data;
  const { groups: groupAccess } = useEntitlements();
  const orgGroups = useQuery({
    queryKey: ["groups"],
    queryFn: fetchGroups,
    enabled: groupAccess && data.kind === "decision" && data.decision === "approval",
  });
  const classification = data.classification;
  return (
    <div className="mt-3">
      {data.kind === "subject" ? (
        <div className="grid gap-1">
          {agents.map((agent) => {
            const on = (data.agentIds ?? []).includes(agent.id);
            return (
              <label key={agent.id} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={on}
                  onChange={() => {
                    const current = data.agentIds ?? [];
                    onChange({ agentIds: on ? current.filter((id) => id !== agent.id) : current.concat(agent.id) });
                  }}
                />
                {agent.name}
              </label>
            );
          })}
          <p className="mt-2 text-[12px] text-muted-foreground">{t("policies.anyAgent")}</p>
        </div>
      ) : null}
      {data.kind === "tool" ? (
        <>
          <select aria-label={t("policies.capability")} disabled={disabled} value={data.tool ?? ""} onChange={(event) => onChange({ tool: event.target.value })} className={inputClass}>
            <option value="">{t("policies.capability")}</option>
            <ToolOptions names={tools} groups={groups} />
          </select>
          {classification ? (
            <dl className="mt-4 space-y-2 text-[12px]">
              <Meta label={t("policies.kind.tool")} value={classification.status ?? ""} />
              <Meta label={t("policies.operation")} value={classification.operation ?? ""} />
              <Meta label={t("policies.resource")} value={classification.resource ?? ""} />
              <Meta label={t("policies.risk")} value={classification.risk ?? ""} />
              <Meta label={t("policies.sideEffects")} value={classification.sideEffects ?? ""} />
              {classification.rationale ? <p className="text-muted-foreground">{classification.rationale}</p> : null}
            </dl>
          ) : null}
        </>
      ) : null}
      {data.kind === "condition" ? (
        <ConditionFields data={data} fields={fields} hasTool={hasTool} disabled={disabled} onChange={onChange} />
      ) : null}
      {data.kind === "logic" ? (
        <select aria-label={t("policies.logic")} disabled={disabled} value={data.op ?? "and"} onChange={(event) => onChange({ op: event.target.value as FlowData["op"] })} className={inputClass}>
          <option value="and">AND</option>
          <option value="or">OR</option>
          <option value="not">NOT</option>
        </select>
      ) : null}
      {data.kind === "decision" ? (
        <>
        <select aria-label={t("policies.decision")}
          disabled={disabled}
          value={data.decision ?? "deny"}
          onChange={(event) => {
            const decision = event.target.value as FlowData["decision"];
            onChange({
              decision,
              ...(decision === "approval" && !data.approvalRequirements
                ? { approvalRequirements: [{ groupId: "", requiredCount: 1 }], allowRequester: false }
                : {}),
            });
          }}
          className={inputClass}
        >
          <option value="allow">{t("policies.action.allow")}</option>
          <option value="approval">{t("policies.action.approval")}</option>
          <option value="deny">{t("policies.action.deny")}</option>
        </select>
        {groupAccess && data.decision === "approval" ? (
          <ApprovalComposer
            disabled={disabled}
            rows={data.approvalRequirements ?? [{ groupId: "", requiredCount: 1 }]}
            allowRequester={data.allowRequester ?? false}
            groups={orgGroups.data ?? []}
            onChange={onChange}
          />
        ) : null}
        </>
      ) : null}
      {data.kind === "enforcement" ? (
        <>
          <p className="text-[12px] text-muted-foreground">{t("policies.auditAlways")}</p>
          <input aria-label={t("policies.rateLimit")} disabled={disabled} value={data.rateLimit ?? ""} placeholder={t("policies.rateLimit")} onChange={(event) => onChange({ rateLimit: event.target.value })} className={inputClass} />
        </>
      ) : null}
      {disabled ? null : (
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" onClick={onDuplicate}>{t("policies.duplicate")}</Button>
          <Button type="button" variant="outline" onClick={onDelete}>{t("policies.remove")}</Button>
        </div>
      )}
    </div>
  );
}

function ApprovalComposer({
  rows,
  groups,
  allowRequester,
  disabled,
  onChange,
}: {
  rows: NodeApprovalRequirement[];
  groups: { id: string; name: string }[];
  allowRequester: boolean;
  disabled: boolean;
  onChange: (patch: Partial<FlowData>) => void;
}) {
  const { t } = useI18n();
  function write(next: NodeApprovalRequirement[]) {
    onChange({ approvalRequirements: next });
  }
  return (
    <div className="mt-3 grid gap-2">
      <p className="text-[12px] text-muted-foreground">{t("policies.approvalBody")}</p>
      {rows.map((row, index) => (
        <div key={`${index}-${row.groupId}`} className="grid gap-2">
          <select
            disabled={disabled}
            value={row.groupId}
            aria-label={t("policies.approvalGroup")}
            onChange={(event) => {
              const group = groups.find((item) => item.id === event.target.value);
              write(rows.map((item, itemIndex) => (
                itemIndex === index ? { ...item, groupId: event.target.value, groupName: group?.name ?? "" } : item
              )));
            }}
            className={inputClass}
          >
            <option value="">{t("policies.approvalAnyone")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-muted-foreground">
              {t("policies.approvalCount")}
              <input
                disabled={disabled}
                type="number"
                min={1}
                max={20}
                value={row.requiredCount}
                onChange={(event) => {
                  const count = Number(event.target.value);
                  write(rows.map((item, itemIndex) => (
                    itemIndex === index ? { ...item, requiredCount: Number.isFinite(count) ? count : 1 } : item
                  )));
                }}
                className={`${inputClass} w-24`}
              />
            </label>
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => write(rows.filter((_, itemIndex) => itemIndex !== index))}
              >
                {t("policies.removeApprovalGroup")}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || rows.length >= 10}
          onClick={() => write(rows.concat({ groupId: "", requiredCount: 1 }))}
        >
          {t("policies.addApprovalGroup")}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          disabled={disabled}
          checked={allowRequester}
          onChange={(event) => onChange({ allowRequester: event.target.checked })}
        />
        {t("policies.allowRequester")}
      </label>
    </div>
  );
}

function draftFromPolicy(policy: ApprovalPolicyRecord): Pick<FlowData, "approvalRequirements" | "allowRequester"> {
  const requirements = policy.requirements ?? [];
  if (requirements.length > 0) {
    return {
      approvalRequirements: requirements.map((item) => ({
        groupId: item.group_id,
        groupName: item.group_name,
        requiredCount: item.required_count,
      })),
      allowRequester: policy.allow_requester,
    };
  }
  return {
    approvalRequirements: [{ groupId: policy.group_id ?? "", requiredCount: policy.required_count || 1 }],
    allowRequester: policy.allow_requester,
  };
}

async function syncNodeApprovals(definition: PolicyDefinition, policyName: string, groupAccess: boolean, incomplete: string) {
  if (!groupAccess) return definition;
  const nodes = [];
  for (const node of definition.nodes) {
    nodes.push(await syncApprovalNode(node, policyName, incomplete));
  }
  return { ...definition, nodes };
}

async function syncApprovalNode(node: PolicyDefinition["nodes"][number], policyName: string, incomplete: string) {
  if (node.type !== "decision" || !node.data || typeof node.data !== "object") return node;
  const data = node.data;
  if (data.decision !== "approval" || !Array.isArray(data.approvalRequirements)) return node;
  const rows = data.approvalRequirements.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [{
      groupId: typeof row.groupId === "string" ? row.groupId : "",
      requiredCount: typeof row.requiredCount === "number" ? row.requiredCount : Number(row.requiredCount),
    }];
  });
  const chosen = rows.filter((row) => row.groupId);
  if ((rows.length > 1 && chosen.length !== rows.length) || new Set(chosen.map((row) => row.groupId)).size !== chosen.length) {
    throw new ApiError(400, incomplete);
  }
  if (chosen.some((row) => !Number.isInteger(row.requiredCount) || row.requiredCount < 1 || row.requiredCount > 20)) {
    throw new ApiError(400, incomplete);
  }
  const allowRequester = data.allowRequester === true;
  const policyId = typeof data.approvalPolicyId === "string" ? data.approvalPolicyId : "";
  if (chosen.length === 0) {
    const count = Number.isInteger(rows[0]?.requiredCount) ? rows[0].requiredCount : 1;
    if (!policyId && count <= 1) return node;
    if (count < 1 || count > 20) throw new ApiError(400, incomplete);
    const saved = policyId
      ? await updateApprovalPolicy(policyId, { required_count: count, requirements: [], allow_requester: allowRequester })
      : await createApprovalPolicy({ name: approvalRecordName(policyName, node.id), required_count: count, allow_requester: allowRequester });
    return { ...node, data: { ...data, approvalPolicyId: saved.id } };
  }
  const requirements = chosen.map((row) => ({ group_id: row.groupId, required_count: row.requiredCount }));
  const saved = policyId
    ? await updateApprovalPolicy(policyId, { requirements, allow_requester: allowRequester })
    : await createApprovalPolicy({
        name: approvalRecordName(policyName, node.id),
        requirements,
        allow_requester: allowRequester,
      });
  return { ...node, data: { ...data, approvalPolicyId: saved.id } };
}

function approvalRecordName(policyName: string, nodeId: string) {
  return `${(policyName.trim() || "Approval").slice(0, 40)} ${nodeId}`.slice(0, 80);
}

function Meta({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ValidationReport({ report }: { report: PolicyValidation | null }) {
  const { t } = useI18n();
  if (!report) return <p className="text-[13px] text-muted-foreground">{t("policies.validate")}</p>;
  return (
    <div className="text-[13px]">
      <p>
        {t("policies.toolCount", { n: report.toolCount })}
        {" · "}
        {t("policies.analyzedCount", { n: report.analyzed })}
        {report.unclassified.length ? ` · ${t("policies.unclassifiedCount", { n: report.unclassified.length })}` : ""}
        {report.insufficient.length ? ` · ${t("policies.insufficientCount", { n: report.insufficient.length })}` : ""}
      </p>
      <ul className="mt-2 space-y-1">
        {report.issues.map((issue, index) => (
          <li key={`${issue.code}-${index}`} className={issue.level === "error" ? "text-destructive" : "text-muted-foreground"}>
            {issue.tool ? `${issue.tool}: ` : ""}
            {issue.message}
          </li>
        ))}
        {report.probes.map((probe, index) => (
          <li key={`probe-${index}`} className={probe.ok ? "text-muted-foreground" : "text-destructive"}>
            {probe.tool}: {probe.message}
            {probe.expected ? ` (${probe.expected} → ${probe.actual})` : ""}
          </li>
        ))}
      </ul>
      {report.review ? <PolicyReviewList review={report.review} /> : null}
    </div>
  );
}

function PolicyReviewList({ review }: { review: PolicyReview }) {
  const { t } = useI18n();
  const reason = (code: string) =>
    code === "description_truncated" ? t("policies.flagDescriptionTruncated") : code === "hidden_characters" ? t("policies.flagHiddenCharacters") : code;
  const names = (items: string[]) => (items.length ? items.join(", ") : t("policies.reviewNone"));
  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="font-medium">{t("policies.reviewTitle")}</p>
      <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">{t("policies.reviewAllows")}</dt>
        <dd className={review.allows.length ? "text-destructive" : undefined}>{names(review.allows)}</dd>
        <dt className="text-muted-foreground">{t("policies.reviewApprovals")}</dt>
        <dd>{names(review.approvals)}</dd>
      </dl>
      {review.flagged_tools.length ? (
        <div className="mt-2">
          <p className="text-destructive">{t("policies.reviewFlagged")}</p>
          <p className="text-muted-foreground">{t("policies.reviewFlaggedNote")}</p>
          <ul className="mt-1 space-y-1">
            {review.flagged_tools.map((item) => (
              <li key={item.tool}>
                <span className="font-mono">{item.tool}</span>: {item.reasons.map(reason).join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

interface SchemaField {
  tool: string;
  name: string;
  type: string;
  enumValues: string[];
  description: string;
}

function schemaFields(schema: Record<string, unknown> | undefined): Omit<SchemaField, "tool">[] {
  const properties = schema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return [];
  return Object.entries(properties as Record<string, unknown>).map(([name, raw]) => {
    const prop = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const enumValues = Array.isArray(prop.enum) ? prop.enum.filter((item) => item != null).map(String) : [];
    const type = typeof prop.type === "string" ? prop.type : enumValues.length ? "string" : "";
    return {
      name,
      type,
      enumValues,
      description: typeof prop.description === "string" ? prop.description : "",
    };
  });
}

function connectedToolNames(nodeId: string, nodes: FlowNode[], edges: Edge[]): string[] {
  const neighbors = new Map<string, string[]>();
  for (const edge of edges) {
    neighbors.set(edge.source, [...(neighbors.get(edge.source) ?? []), edge.target]);
    neighbors.set(edge.target, [...(neighbors.get(edge.target) ?? []), edge.source]);
  }
  const seen = new Set<string>();
  const stack = [nodeId];
  const names: string[] = [];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = nodes.find((item) => item.id === id);
    if (node?.data.kind === "tool" && node.data.tool) names.push(node.data.tool);
    for (const next of neighbors.get(id) ?? []) stack.push(next);
  }
  return Array.from(new Set(names));
}

function ConditionFields({
  data,
  fields,
  hasTool,
  disabled,
  onChange,
}: {
  data: FlowData;
  fields: SchemaField[];
  hasTool: boolean;
  disabled: boolean;
  onChange: (patch: Partial<FlowData>) => void;
}) {
  const { t } = useI18n();
  const current = String(data.field ?? "");
  const selected = fields.find((field) => field.name === current);
  const spelled = fields.find((field) => field.name.toLowerCase() === current.toLowerCase() && field.name !== current);
  const known = new Set(fields.map((field) => field.name));

  function writeValue(raw: string) {
    const type = selected?.type;
    if ((type === "number" || type === "integer") && raw.trim() !== "" && !Number.isNaN(Number(raw))) {
      onChange({ value: type === "integer" ? Number.parseInt(raw, 10) : Number(raw) });
      return;
    }
    onChange({ value: raw });
  }

  return (
    <div className="grid gap-2">
      {fields.length ? (
        <select aria-label={t("policies.field")}
          disabled={disabled}
          value={current}
          onChange={(event) => onChange({ field: event.target.value })}
          className={inputClass}
        >
          <option value="">{t("policies.field")}</option>
          {current && !known.has(current) ? <option value={current}>{current}</option> : null}
          {fields.map((field) => (
            <option key={`${field.tool}.${field.name}`} value={field.name}>
              {field.name}
              {field.type ? ` · ${field.type}` : ""}
            </option>
          ))}
        </select>
      ) : (
        <input aria-label={t("policies.field")}
          disabled={disabled}
          value={current}
          placeholder={t("policies.field")}
          onChange={(event) => onChange({ field: event.target.value })}
          className={inputClass}
        />
      )}
      {spelled ? (
        <button type="button" disabled={disabled} className="text-left text-[12px] text-destructive" onClick={() => onChange({ field: spelled.name })}>
          {t("policies.useField", { name: spelled.name })}
        </button>
      ) : null}
      <p className="text-[12px] text-muted-foreground">
        {fields.length ? selected?.description || t("policies.fieldHint") : hasTool ? t("policies.fieldEmpty") : t("policies.connectTool")}
      </p>
      <select aria-label={t("policies.operator")} disabled={disabled} value={data.operator ?? "eq"} onChange={(event) => onChange({ operator: event.target.value })} className={inputClass}>
        {POLICY_OPERATORS.map((item) => (
          <option key={item.value} value={item.value}>{t(item.labelKey)}</option>
        ))}
      </select>
      {selected?.enumValues.length ? (
        <select aria-label={t("policies.value")} disabled={disabled} value={String(data.value ?? "")} onChange={(event) => onChange({ value: event.target.value })} className={inputClass}>
          <option value="">{t("policies.value")}</option>
          {selected.enumValues.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      ) : selected?.type === "boolean" ? (
        <select aria-label={t("policies.value")}
          disabled={disabled}
          value={data.value === true ? "true" : data.value === false ? "false" : ""}
          onChange={(event) => onChange({ value: event.target.value === "true" })}
          className={inputClass}
        >
          <option value="">{t("policies.value")}</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input aria-label={t("policies.value")}
          disabled={disabled}
          value={String(data.value ?? "")}
          placeholder={t("policies.value")}
          onChange={(event) => writeValue(event.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}

interface ToolGroup {
  id: string;
  name: string;
  tools: { name: string }[];
}

function groupByServer(items: ToolSetItem[]): ToolGroup[] {
  const groups: ToolGroup[] = [];
  for (const item of items) {
    const id = item.serverId || item.serverName || "other";
    let group = groups.find((entry) => entry.id === id);
    if (!group) {
      group = { id, name: item.serverName.trim(), tools: [] };
      groups.push(group);
    }
    if (!group.tools.some((tool) => tool.name === item.name)) {
      group.tools.push({ name: item.name });
    }
  }
  return groups;
}

function ToolOptions({ names, groups }: { names: string[]; groups: ToolGroup[] }) {
  const { t } = useI18n();
  if (!groups.length) {
    return names.map((tool) => (
      <option key={tool} value={tool}>{tool}</option>
    ));
  }
  const listed = new Set(groups.flatMap((group) => group.tools.map((tool) => tool.name)));
  const extra = names.filter((name) => !listed.has(name));
  return (
    <>
      {groups.map((group) => (
        <optgroup key={group.id} label={group.name || t("policies.otherServer")}>
          {group.tools.map((tool) => (
            <option key={tool.name} value={tool.name}>{tool.name}</option>
          ))}
        </optgroup>
      ))}
      {extra.map((tool) => (
        <option key={tool} value={tool}>{tool}</option>
      ))}
    </>
  );
}
