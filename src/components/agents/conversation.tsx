"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { fetchConversation, sendConversation, type ConversationMessage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function ConversationPanel({ agentId }: { agentId: string }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const next = await fetchConversation(agentId);
        if (!stop) {
          setMessages(next);
          setError("");
        }
      } catch {
        if (!stop) setError(t("common.requestFailed"));
      }
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [agentId, t]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const input = draft.trim();
    if (!input || sending) return;
    setSending(true);
    setError("");
    try {
      const created = await sendConversation(agentId, input);
      setMessages((current) => [...current, created]);
      setDraft("");
    } catch {
      setError(t("common.requestFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <SectionLabel>{t("agents.conversation")}</SectionLabel>
      {messages.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">{t("agents.conversationEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {messages.map((message) => (
            <li key={message.id} className="text-[14px] leading-6">
              <p className="whitespace-pre-wrap">{message.input}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {message.output
                  || (message.status === "queued"
                    ? t("agents.conversationWaiting")
                    : message.status === "running" || message.status === "waiting_approval"
                      ? t("agents.running")
                      : message.error || message.status)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(event) => void submit(event)} className="mt-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("agents.conversationPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-card px-3 py-3 text-[14px] leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {error ? <p className="mt-2 text-[13px] text-destructive">{error}</p> : null}
        <Button type="submit" className="mt-3" disabled={sending || !draft.trim()}>
          {t("agents.conversationSend")}
        </Button>
      </form>
    </section>
  );
}
