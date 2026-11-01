import { memo } from "react";

import { Button } from "../ui/button";

/** The row above the composer; each button sends its phrase as a message. */
export const ComposerQuickPhrases = memo(function ComposerQuickPhrases({
  phrases,
  disabled,
  onSend,
}: {
  phrases: ReadonlyArray<string>;
  disabled: boolean;
  onSend: (phrase: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5" data-composer-quick-phrases="true">
      {phrases.map((phrase) => (
        <Button
          key={phrase}
          type="button"
          variant="glass"
          size="xs"
          className="max-w-64"
          title={phrase}
          disabled={disabled}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onSend(phrase)}
        >
          <span className="truncate">{phrase}</span>
        </Button>
      ))}
    </div>
  );
});
