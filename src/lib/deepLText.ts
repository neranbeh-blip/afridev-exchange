
import {
  getAppLanguage,
  type AppLanguage,
} from "./deepLLanguage";
import { translateWithDeepL } from "./deepLTranslate";

const cache = new Map<string, string>();

export async function translateText(
  text: string,
  language: AppLanguage = getAppLanguage(),
): Promise<string> {
  if (language === "EN" || !text.trim()) {
    return text;
  }

  const key = `${language}:${text}`;
  const cached = cache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const translated = await translateWithDeepL(text, language);
  cache.set(key, translated);

  return translated;
}
