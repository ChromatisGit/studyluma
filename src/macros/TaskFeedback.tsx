import { MarkdownRenderer } from "@components/MarkdownRenderer";
import { CollapsibleSection } from "@features/contentpage/components/CollapsibleSection/CollapsibleSection";
import { Stack } from "@components/Stack";

type TaskFeedbackProps = {
  hint?: string | null | undefined;
  answer?: string | null | undefined;
  why?: string | null | undefined;
  showAnswer?: boolean;
  showWhy?: boolean;
  answerDefaultOpen?: boolean;
  whyDefaultOpen?: boolean;
};

export function TaskFeedback({
  hint,
  answer,
  why,
  showAnswer = false,
  showWhy = false,
  answerDefaultOpen = true,
  whyDefaultOpen = true,
}: TaskFeedbackProps) {
  const visibleAnswer = showAnswer ? answer : undefined;
  const visibleWhy = showWhy ? why : undefined;

  if (!hint && !visibleAnswer && !visibleWhy) return null;

  return (
    <Stack gap="sm">
      {hint && (
        <CollapsibleSection type="hint" content={<MarkdownRenderer markdown={hint} />} />
      )}
      {visibleAnswer && (
        <CollapsibleSection
          type="answer"
          defaultOpen={answerDefaultOpen}
          content={<MarkdownRenderer markdown={visibleAnswer} />}
        />
      )}
      {visibleWhy && (
        <CollapsibleSection
          type="why"
          defaultOpen={whyDefaultOpen}
          content={<MarkdownRenderer markdown={visibleWhy} />}
        />
      )}
    </Stack>
  );
}
