
import { useEffect, useState } from "react";
import {
  getAppLanguage,
  type AppLanguage,
} from "./deepLLanguage";
import { translateWithDeepL } from "./deepLTranslate";

const memoryCache = new Map<string, string>();

export function useDeepLTranslation(sourceText: string): {
  text: string;
  language: AppLanguage;
  loading: boolean;
} {
  const [language, setLanguage] = useState<AppLanguage>(getAppLanguage);
  const [text, setText] = useState(sourceText);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ language: AppLanguage }>;
      setLanguage(customEvent.detail.language);
    };

    window.addEventListener("afridev-language-change", onLanguageChange);

    return () => {
      window.removeEventListener("afridev-language-change", onLanguageChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (language === "EN") {
      setText(sourceText);
      setLoading(false);
      return;
    }

    const key = `${language}:${sourceText}`;
    const cached = memoryCache.get(key);

    if (cached !== undefined) {
      setText(cached);
      setLoading(false);
      return;
    }

    setLoading(true);

    translateWithDeepL(sourceText, language)
      .then((translated) => {
        memoryCache.set(key, translated);

        if (!cancelled) {
          setText(translated);
        }
      })
      .catch((error) => {
        console.error("DeepL translation failed:", error);

        if (!cancelled) {
          setText(sourceText);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sourceText, language]);

  return { text, language, loading };
}
