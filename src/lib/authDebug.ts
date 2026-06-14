const PREFIX = "[AdminAuth]";

/** Console logs for auth/API troubleshooting (safe — no tokens). */
export function authDebug(event: string, detail?: Record<string, unknown>) {
  console.info(PREFIX, event, detail ?? "");
}

export const LOGIN_NOTICE_KEY = "admin_login_notice";

export type LoginNotice = "session_expired" | "api_unreachable";

export function setLoginNotice(notice: LoginNotice): void {
  try {
    sessionStorage.setItem(LOGIN_NOTICE_KEY, notice);
  } catch {
    // ignore private mode / quota
  }
}

export function consumeLoginNotice(): LoginNotice | null {
  try {
    const value = sessionStorage.getItem(LOGIN_NOTICE_KEY) as LoginNotice | null;
    if (value) sessionStorage.removeItem(LOGIN_NOTICE_KEY);
    return value;
  } catch {
    return null;
  }
}
