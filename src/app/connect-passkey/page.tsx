"use client";

import { useEffect, useRef, useState } from "react";
import { AuthScreen } from "@/components/layout/auth-screen";
import { Button } from "@/components/ui/button";
import { ApiError, passkeyAnswer } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { apiOrigin } from "@/lib/ws";

// What the API's agent sign-in page hands over in the URL fragment, and expects back.
const FIELDS = [
  "client_id",
  "redirect_uri",
  "state",
  "code_challenge",
  "code_challenge_method",
  "response_type",
  "challenge",
] as const;

/**
 * The passkey step of an agent's sign-in. That sign-in runs on the API's origin, where the
 * browser will not offer a passkey registered for the console, so the API sends the user here.
 * The answer goes back as a page navigation, which lets the API set its own consent cookie.
 */
export default function ConnectPasskeyPage() {
  const { t } = useI18n();
  const handoff = useRef<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (!params.get("challenge")) return;
    handoff.current = Object.fromEntries(FIELDS.map((name) => [name, params.get(name) ?? ""]));
    // Keep the sign-in challenge out of the address bar and the history entry.
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function confirm() {
    const fields = handoff.current;
    if (!fields.challenge) {
      setError(t("login.connectInvalid"));
      return;
    }
    setError("");
    setPending(true);
    try {
      const credential = await passkeyAnswer(fields.challenge);
      // Only ever to the configured API, never to an address taken from the link.
      const form = document.createElement("form");
      form.method = "post";
      form.action = `${apiOrigin()}/oauth/login/passkey`;
      for (const [name, value] of Object.entries({ ...fields, credential: JSON.stringify(credential) })) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (caught) {
      setError(caught instanceof ApiError ? t("login.connectInvalid") : t("login.passkeyFailed"));
      setPending(false);
    }
  }

  return (
    <AuthScreen>
      <h1 className="text-[22px] font-medium tracking-tight">{t("login.connectTitle")}</h1>
      <p className="mt-2 text-[13px] text-muted-foreground">{t("login.connectBody")}</p>
      {error ? <p role="alert" className="mt-3 text-[12px] text-destructive">{error}</p> : null}
      <Button type="button" className="mt-6 w-full" disabled={pending} onClick={() => void confirm()}>
        {t("login.usePasskey")}
      </Button>
    </AuthScreen>
  );
}
