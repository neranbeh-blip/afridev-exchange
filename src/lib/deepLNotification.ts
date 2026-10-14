
import { translateWithDeepL } from "./deepLTranslate";
import { getAppLanguage } from "./deepLLanguage";

export type LocalizableNotification = {
  title: string;
  message: string;
  translation_key?: string | null;
  translation_params?: Record<string, unknown> | null;
};

const titleTranslations: Record<string, string> = {
  "New follower": "New follower",
  "Message request accepted": "Message request accepted",
  "Message request declined": "Message request declined",
  "Message request rejected": "Message request rejected",
  "New exchange request": "New exchange request",
  "New developer interested": "New developer interested",
  "Your problem interest was accepted": "Your problem interest was accepted",
  "Problem interest update": "Problem interest update",
  "Project liked": "Project liked",
  "New project comment": "New project comment",
  "New project application": "New project application",
  "Project application accepted": "Project application accepted",
  "Project application rejected": "Project application rejected",
  "Exchange negotiation": "Exchange negotiation",
  "Exchange accepted": "Exchange accepted",
  "Collaboration started": "Collaboration started",
  "Exchange completed": "Exchange completed",
  "Exchange rejected": "Exchange rejected",
};

const messagePatterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^(.+) started following you\.$/, m => `${m[1]} started following you.`],
  [/^(.+) accepted your message request\.?$/, m => `${m[1]} accepted your message request.`],
  [/^(.+) declined your message request\.?$/, m => `${m[1]} declined your message request.`],
  [/^(.+) rejected your message request\.?$/, m => `${m[1]} rejected your message request.`],
  [/^(.+) sent you an exchange request\.$/, m => `${m[1]} sent you an exchange request.`],
  [/^A developer is interested in helping with "(.+)"\.$/, m => `A developer is interested in helping with "${m[1]}".`],
  [/^You were accepted to help with "(.+)"\.$/, m => `You were accepted to help with "${m[1]}".`],
  [/^The creator declined your interest in "(.+)"\.$/, m => `The creator declined your interest in "${m[1]}".`],
  [/^Someone liked your completed project "(.+)"\.$/, m => `Someone liked your completed project "${m[1]}".`],
  [/^Someone commented on your completed project "(.+)"\.$/, m => `Someone commented on your completed project "${m[1]}".`],
  [/^A developer applied to collaborate on "(.+)"\.$/, m => `A developer applied to collaborate on "${m[1]}".`],
  [/^Your application to "(.+)" was accepted\.$/, m => `Your application to "${m[1]}" was accepted.`],
  [/^Your application to "(.+)" was rejected\.$/, m => `Your application to "${m[1]}" was rejected.`],
  [/^The exchange "(.+)" is now being negotiated\.$/, m => `The exchange "${m[1]}" is now being negotiated.`],
  [/^The exchange "(.+)" was accepted\.$/, m => `The exchange "${m[1]}" was accepted.`],
  [/^The collaboration "(.+)" is now active\.$/, m => `The collaboration "${m[1]}" is now active.`],
  [/^The exchange "(.+)" has been completed\.$/, m => `The exchange "${m[1]}" has been completed.`],
  [/^The exchange "(.+)" was rejected\.$/, m => `The exchange "${m[1]}" was rejected.`],
];

export async function localizeNotification(
  notification: LocalizableNotification,
): Promise<{ title: string; message: string }> {
  const language = getAppLanguage();

  const originalTitle = titleTranslations[notification.title] ?? notification.title;
  const originalMessage = notification.message || "";

  if (language === "EN") {
    return { title: originalTitle, message: originalMessage };
  }

  const title = await translateWithDeepL(originalTitle, language);

  // Translate only known app-generated message patterns.
  // Keep names and project titles unchanged.
  for (const [pattern, buildMessage] of messagePatterns) {
    const match = originalMessage.match(pattern);
    if (match) {
      const template = buildMessage(match);
      const translatedTemplate = await translateWithDeepL(template, language);
      return { title, message: translatedTemplate };
    }
  }

  // For other messages, translate the message as provided.
  const message = originalMessage
    ? await translateWithDeepL(originalMessage, language)
    : "";

  return { title, message };
}
