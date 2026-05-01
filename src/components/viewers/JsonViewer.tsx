import { useEffect, useMemo, useState } from "react";
import { parse, printParseErrorCode } from "jsonc-parser";
import type { ParseError } from "jsonc-parser";
import type { ViewerComponentProps } from "../../types";
import { readFileAsText } from "../../utils/fetchFile";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type JsonParseIssue = {
  message: string;
  line?: number;
  column?: number;
  position?: number;
};

export function JsonViewer({ src, style, theme }: ViewerComponentProps) {
  const [parsed, setParsed] = useState<JsonValue | null>(null);
  const [source, setSource] = useState<string>("");
  const [issues, setIssues] = useState<JsonParseIssue[]>([]);
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const treeTheme = useMemo(() => getJsonTreeTheme(theme), [theme]);

  useEffect(() => {
    let cancelled = false;

    readFileAsText(src)
      .then((value) => {
        const parseErrors: ParseError[] = [];
        const parsedValue = parse(value, parseErrors, {
          allowTrailingComma: false,
          disallowComments: true,
        }) as JsonValue;

        if (!cancelled) {
          setSource(value);
          setCollapsedPaths(new Set());
          if (parseErrors.length > 0) {
            setParsed(null);
            setIssues(parseErrors.map((parseError) => getJsonParseIssue(value, parseError)));
          } else {
            setParsed(parsedValue);
            setIssues([]);
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSource("");
          setParsed(null);
          setCollapsedPaths(new Set());
          setIssues([{
            message: err instanceof Error ? err.message : "Unable to load JSON file.",
          }]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (issues.length > 0) {
    return <InvalidJsonState issues={issues} source={source} style={style} theme={theme} />;
  }

  return (
    <div
      style={{
        ...style,
        overflow: "auto",
        padding: 20,
        backgroundColor: treeTheme.background,
        color: treeTheme.text,
        fontFamily:
          '"Cascadia Code", "Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        fontSize: 14,
        lineHeight: 1.65,
      }}
    >
      {parsed !== null ? (
        <JsonTree
          value={parsed}
          path="root"
          depth={0}
          isLast
          collapsedPaths={collapsedPaths}
          onToggle={(path) => {
            setCollapsedPaths((current) => {
              const next = new Set(current);
              if (next.has(path)) {
                next.delete(path);
              } else {
                next.add(path);
              }
              return next;
            });
          }}
          theme={treeTheme}
        />
      ) : null}
    </div>
  );
}

function InvalidJsonState({
  issues,
  source,
  style,
  theme,
}: {
  issues: JsonParseIssue[];
  source: string;
  style: ViewerComponentProps["style"];
  theme: ViewerComponentProps["theme"];
}) {
  const isDark = theme === "dark";
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const issueLines = new Set(issues.map((issue) => issue.line).filter((line): line is number => typeof line === "number"));

  return (
    <div
      style={{
        ...style,
        overflow: "auto",
        padding: 16,
        backgroundColor: isDark ? "#111827" : "#ffffff",
        color: isDark ? "#e5e7eb" : "#111827",
        fontFamily:
          '"Cascadia Code", "Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      }}
    >
      <div
        style={{
          marginBottom: 16,
          borderRadius: 8,
          backgroundColor: "#cf402f",
          color: "#ffffff",
          textAlign: "center",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 0.4,
          padding: "8px 12px",
        }}
      >
        INVALID JSON
      </div>

      <div style={{ marginBottom: 10, fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 700, fontSize: 14 }}>
        Validator Output
      </div>

      <div
        style={{
          marginBottom: 20,
          border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
          borderRadius: 8,
          backgroundColor: isDark ? "#1f2937" : "#f8fafc",
          overflow: "hidden",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {issues.map((issue, index) => (
          <InfoRow
            key={`${issue.message}-${issue.position ?? index}-${index}`}
            label={index === 0 ? "Error" : `Error ${index + 1}`}
            color={isDark ? "#fca5a5" : "#b91c1c"}
            value={issue.message}
            detail={formatIssueLocation(issue)}
          />
        ))}
      </div>

      <div style={{ marginBottom: 10, fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 700, fontSize: 14 }}>
        JSON Source
      </div>

      <div
        style={{
          border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
          borderRadius: 8,
          backgroundColor: isDark ? "#0b1220" : "#ffffff",
          overflow: "auto",
        }}
      >
        <pre
          style={{
            margin: 0,
            padding: 16,
            fontSize: 14,
            lineHeight: 1.65,
            minHeight: "100%",
          }}
        >
          <code style={{ display: "block", minWidth: "max-content" }}>
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isActiveLine = issueLines.has(lineNumber);

              return (
                <span
                  key={lineNumber}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    columnGap: 16,
                    backgroundColor: isActiveLine ? (isDark ? "#3a161b" : "#fef2f2") : "transparent",
                    borderRadius: 4,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: "sticky",
                      left: 0,
                      minWidth: "2ch",
                      paddingRight: 4,
                      textAlign: "right",
                      userSelect: "none",
                      color: isActiveLine ? "#cf402f" : isDark ? "#64748b" : "#94a3b8",
                      backgroundColor: isActiveLine
                        ? (isDark ? "#3a161b" : "#fef2f2")
                        : isDark
                          ? "#0b1220"
                          : "#ffffff",
                    }}
                  >
                    {lineNumber}
                  </span>
                  <span style={{ whiteSpace: "pre", color: isDark ? "#e5e7eb" : "#1f2937" }}>
                    {line || " "}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  color,
  value,
  detail,
}: {
  label: string;
  color: string;
  value: string;
  detail?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "96px 1fr",
        gap: 12,
        padding: "12px 16px",
        alignItems: "start",
      }}
    >
      <div style={{ fontWeight: 700, color }}>{label}:</div>
      <div>
        <span style={{ color }}>{value}</span>
        {detail ? <span style={{ marginLeft: 8, opacity: 0.7, fontStyle: "italic" }}>{detail}</span> : null}
      </div>
    </div>
  );
}

function JsonTree({
  value,
  path,
  depth,
  isLast,
  collapsedPaths,
  onToggle,
  theme,
  propertyName,
}: {
  value: JsonValue;
  path: string;
  depth: number;
  isLast: boolean;
  collapsedPaths: Set<string>;
  onToggle: (path: string) => void;
  theme: JsonTreeTheme;
  propertyName?: string;
}) {
  const indent = depth * 20;
  const isCollapsible = typeof value === "object" && value !== null;
  const isCollapsed = isCollapsible && collapsedPaths.has(path);
  const comma = isLast ? "" : ",";

  if (!isCollapsible) {
    return (
      <div style={{ paddingLeft: indent, whiteSpace: "pre" }}>
        {propertyName ? <span style={{ color: theme.key }}>"{propertyName}"</span> : null}
        {propertyName ? <span style={{ color: theme.punctuation }}>: </span> : null}
        <JsonPrimitiveValue value={value} theme={theme} />
        <span style={{ color: theme.punctuation }}>{comma}</span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);

  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";
  const collapsedSummary = isArray
    ? `${value.length} item${value.length === 1 ? "" : "s"}`
    : `${entries.length} key${entries.length === 1 ? "" : "s"}`;

  if (isCollapsed) {
    return (
      <div style={{ paddingLeft: indent, whiteSpace: "pre" }}>
        <ToggleButton collapsed onClick={() => onToggle(path)} theme={theme} />
        {propertyName ? <span style={{ color: theme.key }}>"{propertyName}"</span> : null}
        {propertyName ? <span style={{ color: theme.punctuation }}>: </span> : null}
        <span style={{ color: theme.punctuation }}>{openBracket}</span>
        <span style={{ color: theme.comment, fontStyle: "italic" }}> {collapsedSummary} </span>
        <span style={{ color: theme.punctuation }}>{closeBracket}{comma}</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ paddingLeft: indent, whiteSpace: "pre" }}>
        <ToggleButton collapsed={false} onClick={() => onToggle(path)} theme={theme} />
        {propertyName ? <span style={{ color: theme.key }}>"{propertyName}"</span> : null}
        {propertyName ? <span style={{ color: theme.punctuation }}>: </span> : null}
        <span style={{ color: theme.punctuation }}>{openBracket}</span>
      </div>

      {entries.length === 0 ? null : (
        <div>
          {entries.map(([entryKey, entryValue], index) => (
            <JsonTree
              key={`${path}.${entryKey}`}
              value={entryValue}
              path={`${path}.${entryKey}`}
              depth={depth + 1}
              isLast={index === entries.length - 1}
              collapsedPaths={collapsedPaths}
              onToggle={onToggle}
              theme={theme}
              propertyName={isArray ? undefined : entryKey}
            />
          ))}
        </div>
      )}

      <div style={{ paddingLeft: indent, whiteSpace: "pre" }}>
        <span style={{ display: "inline-block", width: 20 }} />
        <span style={{ color: theme.punctuation }}>{closeBracket}{comma}</span>
      </div>
    </div>
  );
}

function JsonPrimitiveValue({
  value,
  theme,
}: {
  value: JsonPrimitive;
  theme: JsonTreeTheme;
}) {
  if (value === null) {
    return <span style={{ color: theme.keyword }}>null</span>;
  }

  if (typeof value === "string") {
    return <span style={{ color: theme.string }}>"{value}"</span>;
  }

  if (typeof value === "number") {
    return <span style={{ color: theme.number }}>{String(value)}</span>;
  }

  return <span style={{ color: theme.boolean }}>{String(value)}</span>;
}

function ToggleButton({
  collapsed,
  onClick,
  theme,
}: {
  collapsed: boolean;
  onClick: () => void;
  theme: JsonTreeTheme;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? "Expand node" : "Collapse node"}
      style={{
        width: 16,
        height: 16,
        marginRight: 4,
        padding: 0,
        border: `1px solid ${theme.toggleBorder}`,
        borderRadius: 3,
        backgroundColor: theme.toggleBackground,
        color: theme.toggleText,
        fontSize: 12,
        lineHeight: "14px",
        textAlign: "center",
        cursor: "pointer",
        verticalAlign: "middle",
      }}
    >
      {collapsed ? "+" : "-"}
    </button>
  );
}

type JsonTreeTheme = {
  background: string;
  text: string;
  key: string;
  string: string;
  number: string;
  boolean: string;
  keyword: string;
  punctuation: string;
  comment: string;
  toggleBorder: string;
  toggleBackground: string;
  toggleText: string;
};

function getJsonTreeTheme(theme: ViewerComponentProps["theme"]): JsonTreeTheme {
  if (theme === "dark") {
    return {
      background: "#111827",
      text: "#d4d4d4",
      key: "#9cdcfe",
      string: "#ce9178",
      number: "#b5cea8",
      boolean: "#569cd6",
      keyword: "#c586c0",
      punctuation: "#d4d4d4",
      comment: "#6a9955",
      toggleBorder: "#4b5563",
      toggleBackground: "#1f2937",
      toggleText: "#e5e7eb",
    };
  }

  return {
    background: "#ffffff",
    text: "#24292f",
    key: "#0550ae",
    string: "#0a3069",
    number: "#0550ae",
    boolean: "#8250df",
    keyword: "#8250df",
    punctuation: "#57606a",
    comment: "#6a737d",
    toggleBorder: "#cbd5e1",
    toggleBackground: "#f8fafc",
    toggleText: "#334155",
  };
}

function getJsonParseIssue(source: string, err: unknown): JsonParseIssue {
  if (isParseError(err)) {
    const { line, column } = getLineAndColumnFromPosition(source, err.offset);
    return {
      message: humanizeParseError(err),
      position: err.offset,
      line,
      column,
    };
  }

  const fallbackMessage = err instanceof Error ? err.message : "Unable to parse JSON.";
  const message = fallbackMessage.replace(/^JSON\.parse:\s*/i, "");
  const positionMatch = message.match(/position\s+(\d+)/i) ?? message.match(/at\s+position\s+(\d+)/i);
  const position = positionMatch ? Number(positionMatch[1]) : undefined;

  if (typeof position !== "number" || Number.isNaN(position)) {
    return { message };
  }

  const { line, column } = getLineAndColumnFromPosition(source, position);
  return { message, position, line, column };
}

function getLineAndColumnFromPosition(source: string, position: number): { line: number; column: number } {
  let line = 1;
  let column = 1;

  for (let index = 0; index < position; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function formatIssueLocation(issue: JsonParseIssue): string | undefined {
  if (issue.line && issue.column) {
    return `[Line ${issue.line}, Column ${issue.column}]`;
  }

  if (typeof issue.position === "number") {
    return `[Position ${issue.position}]`;
  }

  return undefined;
}

function isParseError(value: unknown): value is ParseError {
  return typeof value === "object" && value !== null && "error" in value && "offset" in value;
}

function humanizeParseError(error: ParseError): string {
  const code = printParseErrorCode(error.error);
  const messages: Record<string, string> = {
    InvalidSymbol: "Invalid symbol.",
    InvalidNumberFormat: "Invalid number format.",
    PropertyNameExpected: "Property name expected.",
    ValueExpected: "Value expected.",
    ColonExpected: "Colon expected.",
    CommaExpected: "Comma expected.",
    CloseBraceExpected: "Closing brace expected.",
    CloseBracketExpected: "Closing bracket expected.",
    EndOfFileExpected: "Unexpected extra content after valid JSON.",
    InvalidCommentToken: "Comments are not allowed in JSON.",
    UnexpectedEndOfComment: "Unexpected end of comment.",
    UnexpectedEndOfString: "Unexpected end of string.",
    UnexpectedEndOfNumber: "Unexpected end of number.",
    InvalidUnicode: "Invalid unicode escape.",
    InvalidEscapeCharacter: "Invalid escape character.",
    InvalidCharacter: "Invalid character.",
  };

  return messages[code] ?? code;
}
