
export type AppLanguage = "EN" | "FR";

const STORAGE_KEY = "afridev-language";

export function getAppLanguage(): AppLanguage {
  try {
    return localStorage.getItem(STORAGE_KEY) === "FR" ? "FR" : "EN";
  } catch {
    return "EN";
  }
}

export function setAppLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The selected language still works for this session.
  }

  window.dispatchEvent(
    new CustomEvent("afridev-language-change", {
      detail: { language },
    }),
  );
}
