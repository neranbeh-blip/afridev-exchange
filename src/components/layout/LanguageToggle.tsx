
import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import {
  getAppLanguage,
  setAppLanguage,
  type AppLanguage,
} from "../../lib/deepLLanguage";

export default function LanguageToggle() {
  const [language, setLanguage] = useState<AppLanguage>(getAppLanguage);

  useEffect(() => {
    const onLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ language: AppLanguage }>;
      setLanguage(customEvent.detail.language);
    };

    window.addEventListener("afridev-language-change", onLanguageChange);

    return () => {
      window.removeEventListener(
        "afridev-language-change",
        onLanguageChange,
      );
    };
  }, []);

  const isFrench = language === "FR";

  function toggleLanguage() {
    const nextLanguage: AppLanguage = isFrench ? "EN" : "FR";
    setAppLanguage(nextLanguage);
    setLanguage(nextLanguage);
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={isFrench ? "Passer en anglais" : "Switch to French"}
      title={isFrench ? "Passer en anglais" : "Switch to French"}
    >
      <Languages size={17} aria-hidden="true" />
      <span>{isFrench ? "English" : "Français"}</span>
    </button>
  );
}
