"use client";

import { DragEvent, createContext, useContext, useMemo, useState } from "react";
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
import { syncNodeApprovals } from "@/components/policies/policy-approval-sync";
import { connectedToolNames, groupByServer, schemaFields } from "@/components/policies/policy-builder-schema";
import { PolicyForm } from "@/components/policies/policy-form";
import { NodeInspector, ToolOptions, inputClass } from "@/components/policies/policy-node-inspector";
import { NODE_DRAG_TYPE, PolicyNodeLibrary, isNodeKind } from "@/components/policies/policy-node-library";
import { PolicyOptimizeProposal, type PolicyProposal } from "@/components/policies/policy-optimize-proposal";
import { PolicyProgressBar, applyProgress, type PolicyProgress } from "@/components/policies/policy-thinking";
import { ValidationReport } from "@/components/policies/policy-validation-report";
import { useApprovalDrafts } from "@/components/policies/use-approval-drafts";
import { ApiError, activatePolicy, simulatePolicy, streamPolicy, validatePolicy, type PolicyValidation } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { approvalSummary, definitionFromRules, newNode, toDefinition, toFlow, type FlowData, type FlowNode } from "@/lib/policy-graph";
import { cn } from "@/lib/utils";
import type { Agent, Policy, PolicyDefinition, ToolSet } from "@/types";

const AgentContext = createContext<Agent[]>([]);

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
  const groupAccess = useApprovalDrafts(setNodes);
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
  const [proposal, setProposal] = useState<PolicyProposal | null>(null);
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

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const kind = event.dataTransfer.getData(NODE_DRAG_TYPE);
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
        <p role="alert" className="border-b border-border px-4 py-2 text-[13px] text-destructive">
          {error || (remove.error instanceof Error ? remove.error.message : t("policies.saveFailed"))}
        </p>
      ) : null}
      {jsonError ? <p role="alert" className="border-b border-border px-4 py-2 text-[13px] text-destructive">{jsonError}</p> : null}
      <div className="flex min-h-0 flex-1">
        {view === "canvas" ? (
        <PolicyNodeLibrary canWrite={canWrite} toolGroups={toolGroups} toolNames={toolNames} analyses={analyses} setNodes={setNodes} />
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
                <PolicyOptimizeProposal
                  proposal={proposal}
                  canWrite={canWrite}
                  onApply={() => {
                    applyGraph(proposal.definition);
                    setProposal(null);
                    setView("json");
                  }}
                  onDiscard={() => setProposal(null)}
                />
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
