
import { supabase } from "./supabase";

export type DeepLLanguage = "EN" | "FR";

const CACHE_PREFIX = "afridev-deepl-v1:";
const MAX_TEXT_LENGTH = 3000;

function cacheKey(text: string, targetLang: DeepLLanguage): string {
  return `${CACHE_PREFIX}${targetLang}:${text}`;
}

export async function translateWithDeepL(
  text: string,
  targetLang: DeepLLanguage,
): Promise<string> {
  if (!text.trim()) return text;

  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error("Text exceeds the 3000-character translation limit.");
  }

  const key = cacheKey(text, targetLang);

  try {
    const cached = localStorage.getItem(key);
    if (cached !== null) return cached;
  } catch {
    // Continue if browser storage is unavailable.
  }

  const { data, error } = await supabase.functions.invoke(
    "translate-text",
    {
      body: { text, targetLang },
    },
  );

  if (error) {
    throw new Error(`DeepL translation request failed: ${error.message}`);
  }

  if (
    !data ||
    typeof data.translatedText !== "string"
  ) {
    throw new Error("DeepL returned an invalid translation response.");
  }

  try {
    localStorage.setItem(key, data.translatedText);
  } catch {
    // The translation still works if caching is unavailable.
  }

  return data.translatedText;
}
