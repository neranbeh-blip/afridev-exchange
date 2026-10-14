
import { useDeepLTranslation } from "../../lib/useDeepLTranslation";

type DeepLTextProps = {
  text: string;
  className?: string;
};

export default function DeepLText({
  text,
  className,
}: DeepLTextProps) {
  const { text: translatedText } = useDeepLTranslation(text);

  return <span className={className}>{translatedText}</span>;
}
