/** Renders text with `backtick` spans as <code>, matching the Markdown the same copy is served as. */
export function InlineCode({ text }: { text: string }) {
  return text.split(/`([^`]+)`/).map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} className="font-mono text-foreground">
        {part}
      </code>
    ) : (
      part
    ),
  );
}
