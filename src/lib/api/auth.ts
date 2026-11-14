import { useAuthStore } from "@/lib/auth";
import { legacyLoginVerifier, loginVerifier } from "@/lib/password";
import { localeRevisionNow, localeSavePending, useLocaleStore } from "@/stores/locale-store";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import type { PasswordBackup } from "./payload-keys";
import { ApiError, del, get, patch, post } from "./transport";
import type { AuthUserResponse, LoginChallenge, LoginResponse, MfaStatus, NoticeSettings } from "./types";

export function toAuthSession(token: string | null, user: AuthUserResponse) {
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      photo: user.photo ?? null,
      status: user.status,
      employeeTitle: user.employee?.title,
      role: user.role ?? user.employee?.role ?? undefined,
      permissions: user.permissions,
      agentEditIds: user.agent_edit_ids ?? null,
      locale: user.locale,
      mfaSetupRequired: Boolean(user.mfa_setup_required),
      agents: user.agents.map((agent) => ({ id: agent.id, name: agent.name })),
      mcpServers: user.mcp_servers.map((server) => ({
        id: server.id,
        name: server.name,
      })),
    },
    org: {
      ...(user.organization),
      plan: user.organization.plan,
      kind: user.organization.kind,
    },
  };
}

async function establishSession(result: LoginResponse) {
  useAuthStore.getState().setSession(toAuthSession(null, result.user));
  try {
    await fetchMe();
  } catch {
    useAuthStore.getState().setSession(toAuthSession(result.token ?? null, result.user));
  }
}

async function finishLogin(result: LoginResponse & Partial<LoginChallenge>): Promise<LoginResponse | LoginChallenge> {
  if (result.mfa_required && result.challenge) {
    return { mfa_required: true, challenge: result.challenge, methods: result.methods ?? [] };
  }
  if (!result.user) {
    throw new ApiError(500, "Could not sign in");
  }
  const session = { token: result.token ?? null, user: result.user };
  await establishSession(session);
  return session;
}

export async function login(email: string, password: string): Promise<LoginResponse | LoginChallenge> {
  const verifier = await loginVerifier(password, email);
  const body = { email, password: verifier, locale: useLocaleStore.getState().locale };
  const submit = async (extra: { legacy_v1?: string; legacy_password?: string } = {}) =>
    finishLogin(
      await post<LoginResponse & Partial<LoginChallenge>>("/auth/login", { ...body, ...extra }, false),
    );
  try {
    return await submit();
  } catch (error) {
    if (!(error instanceof ApiError) || error.migration !== "v1") {
      if (error instanceof ApiError && error.migration === "password") return submit({ legacy_password: password });
      throw error;
    }
    try {
      return await submit({ legacy_v1: await legacyLoginVerifier(password) });
    } catch (next) {
      if (!(next instanceof ApiError) || next.migration !== "password") throw next;
      return submit({ legacy_password: password });
    }
  }
}

export async function requestSignupCode(name: string, email: string, password: string) {
  return post<void>(
    "/auth/register/code",
    { name, email, password: await loginVerifier(password, email), locale: useLocaleStore.getState().locale },
    false
  );
}

export async function registerAccount(name: string, email: string, password: string, code: string, organization?: string) {
  const result = await post<LoginResponse>(
    "/auth/register",
    {
      name,
      email,
      password: await loginVerifier(password, email),
      code,
      locale: useLocaleStore.getState().locale,
      organization: organization || undefined,
    },
    false
  );
  await establishSession(result);
  return result;
}

/** An admin with a passkey or an authenticator app gets a challenge back: the emailed code is not enough. */
export async function loginWithEmailCode(challenge: string, code: string): Promise<LoginResponse | LoginChallenge> {
  return finishLogin(
    await post<LoginResponse & Partial<LoginChallenge>>("/auth/login/email", { challenge, code }, false),
  );
}

export async function loginWithTotp(challenge: string, code: string) {
  const result = await post<LoginResponse>("/auth/login/totp", { challenge, code }, false);
  await establishSession(result);
  return result;
}

/** The passkey answer for a sign-in challenge, for the caller to deliver. Does not sign in here. */
export async function passkeyAnswer(challenge: string) {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const options = await post<PublicKeyCredentialRequestOptionsJSON>(
    "/auth/login/passkey/options",
    { challenge },
    false
  );
  return startAuthentication({ optionsJSON: options });
}

export async function loginWithPasskey(challenge: string) {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const options = await post<PublicKeyCredentialRequestOptionsJSON>(
    "/auth/login/passkey/options",
    { challenge },
    false
  );
  const credential = await startAuthentication({ optionsJSON: options });
  const result = await post<LoginResponse>("/auth/login/passkey", { challenge, credential }, false);
  await establishSession(result);
  return result;
}

export async function logout() {
  try {
    await post<void>("/auth/logout");
  } finally {
    const { clearMemberKey, holdOrganizationKey } = await import("@/lib/payload-crypto");
    // Both private keys live only in memory. Drop them so the next person on this tab cannot use them.
    clearMemberKey();
    holdOrganizationKey(null);
    useAuthStore.getState().clear();
  }
}

export async function updateProfile(body: { name: string; email: string }) {
  const user = await patch<AuthUserResponse>("/auth/me", body);
  useAuthStore.getState().setSession(toAuthSession(useAuthStore.getState().token, user));
  return user;
}

export async function updatePersonalPhoto(photo: string | null) {
  const user = await patch<AuthUserResponse>("/auth/me/photo", { photo });
  useAuthStore.getState().setSession(toAuthSession(useAuthStore.getState().token, user));
  return user;
}

export function setupTotp() {
  return post<{ secret: string; otpauth_url: string; backup_codes: string[] }>("/auth/totp/setup", {});
}

export function confirmTotp(code: string) {
  return post<void>("/auth/totp/confirm", { code });
}

export async function fetchMe() {
  const revision = localeRevisionNow();
  const user = await get<AuthUserResponse>("/auth/me");
  useAuthStore.getState().setSession(toAuthSession(useAuthStore.getState().token, user));
  if (user.locale && revision === localeRevisionNow() && !localeSavePending()) {
    useLocaleStore.getState().setLocale(user.locale.toLowerCase().startsWith("en") ? "en" : "zh");
  }
  return user;
}

export function updateAccountLocale(locale: string) {
  return patch<{ locale: string }>("/auth/locale", { locale });
}

export async function restoreSession(): Promise<boolean> {
  try {
    await fetchMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    return Boolean(useAuthStore.getState().user);
  }
  const token = useAuthStore.getState().token;
  if (token) {
    try {
      await post<void>("/auth/session");
      useAuthStore.getState().clearToken();
    } catch {
      // A stored bearer still authorizes this page load.
    }
  }
  return Boolean(useAuthStore.getState().user);
}

export function requestPasswordReset(email: string) {
  return post<void>("/auth/forgot-password", { email, locale: useLocaleStore.getState().locale }, false);
}

export async function resetPassword(email: string, code: string, password: string) {
  return post<void>("/auth/reset-password", { email, code, password: await loginVerifier(password, email) }, false);
}

function signedInEmail() {
  const email = useAuthStore.getState().user?.email;
  if (!email) throw new ApiError(401, "Not signed in");
  return email;
}

/**
 * memberBackup is the member's private key re-wrapped for the new password. The key that wraps
 * it comes from the password, so without a new copy the stored one can no longer be opened.
 * Use changePasswordKeepingKey in payload-crypto, which builds it.
 */
export async function changePassword(currentPassword: string, newPassword: string, memberBackup?: PasswordBackup | null) {
  const email = signedInEmail();
  return patch<void>("/auth/password", {
    current_password: await loginVerifier(currentPassword, email),
    new_password: await loginVerifier(newPassword, email),
    ...(memberBackup ? { member_backup: memberBackup } : {}),
  });
}

export function fetchMfa() {
  return get<MfaStatus>("/auth/mfa");
}

export function fetchNotices() {
  return get<NoticeSettings>("/auth/notices");
}

export function updateNotices(body: NoticeSettings) {
  return patch<NoticeSettings>("/auth/notices", body);
}

export function requestEmailMfa() {
  return post<void>("/auth/mfa/email/code", { locale: useLocaleStore.getState().locale });
}

export function enableEmailMfa(code: string) {
  return post<void>("/auth/mfa/email", { code });
}

export function disableEmailMfa() {
  return del("/auth/mfa/email");
}

export async function reauthenticate(password: string) {
  return post<void>("/auth/reauth", { password: await loginVerifier(password, signedInEmail()) });
}

export function requestReauthCode() {
  return post<void>("/auth/reauth/email/code", { locale: useLocaleStore.getState().locale });
}

export function reauthenticateWithCode(code: string) {
  return post<void>("/auth/reauth", { code });
}

export async function reauthenticateWithPasskey() {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const options = await post<PublicKeyCredentialRequestOptionsJSON>("/auth/reauth/passkey/options", {});
  const credential = await startAuthentication({ optionsJSON: options });
  return post<void>("/auth/reauth", { credential });
}

/**
 * What is sent as the password is derived from the password and the email, so it changes with
 * the email. rekey carries the password, the new address, and the re-wrapped member key, so
 * the password keeps working afterwards. Use confirmEmailChangeKeepingKey in payload-crypto.
 */
export async function confirmEmailChange(
  currentCode: string,
  nextCode: string,
  rekey?: { password: string; nextEmail: string; memberBackup?: PasswordBackup | null },
) {
  const user = await post<AuthUserResponse>("/auth/email/confirm", {
    current_code: currentCode,
    next_code: nextCode,
    ...(rekey
      ? {
          current_password: await loginVerifier(rekey.password, signedInEmail()),
          new_password: await loginVerifier(rekey.password, rekey.nextEmail),
          ...(rekey.memberBackup ? { member_backup: rekey.memberBackup } : {}),
        }
      : {}),
  });
  useAuthStore.getState().setSession(toAuthSession(useAuthStore.getState().token, user));
  return user;
}

export async function registerPasskey() {
  const { startRegistration } = await import("@simplewebauthn/browser");
  const options = await post<PublicKeyCredentialCreationOptionsJSON>("/auth/passkeys/options", {});
  const credential = await startRegistration({ optionsJSON: options });
  return post<MfaStatus["passkeys"][number]>("/auth/passkeys", { credential });
}

export function deletePasskey(id: string) {
  return del(`/auth/passkeys/${id}`);
}

export async function acceptInvite(token: string, password: string, email: string) {
  const result = await post<LoginResponse>("/auth/accept-invite", { token, password: await loginVerifier(password, email) }, false);
  await establishSession(result);
  return result;
}
