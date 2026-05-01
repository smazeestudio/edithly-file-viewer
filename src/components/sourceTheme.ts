import type { FileViewerTheme } from "../types";

export const sourceTheme = {
  dark: {
    bg: "#111827",
    text: "#d4d4d4",
    lineNumber: "#6b7280",
    comment: "#6a9955",
    keyword: "#c586c0",
    string: "#ce9178",
    function: "#dcdcaa",
    className: "#4ec9b0",
    number: "#b5cea8",
    property: "#9cdcfe",
    operator: "#d4d4d4",
    punctuation: "#d4d4d4",
    tag: "#569cd6",
    attrName: "#9cdcfe",
    attrValue: "#ce9178",
    regex: "#d16969",
    boolean: "#569cd6",
  },
  light: {
    bg: "#ffffff",
    text: "#24292f",
    lineNumber: "#8c959f",
    comment: "#6a737d",
    keyword: "#8250df",
    string: "#0a3069",
    function: "#953800",
    className: "#116329",
    number: "#0550ae",
    property: "#116329",
    operator: "#24292f",
    punctuation: "#57606a",
    tag: "#0550ae",
    attrName: "#116329",
    attrValue: "#0a3069",
    regex: "#bc4c00",
    boolean: "#0550ae",
  },
} as const;

export type SourcePalette = (typeof sourceTheme)[keyof typeof sourceTheme];

export function getSourcePalette(theme: FileViewerTheme): SourcePalette {
  return sourceTheme[theme];
}

export function getSourceThemeCss(palette: SourcePalette, className: string): string {
  return `
    .${className} {
      color: ${palette.text};
      background: transparent;
      font-variant-ligatures: contextual;
      tab-size: 2;
      display: block;
      min-width: max-content;
    }

    .${className} .fv-code-line {
      display: grid;
      grid-template-columns: auto 1fr;
      column-gap: 16px;
    }

    .${className} .fv-code-line-number {
      position: sticky;
      left: 0;
      padding-right: 4px;
      min-width: 2ch;
      text-align: right;
      user-select: none;
      color: ${palette.lineNumber};
      background: ${palette.bg};
    }

    .${className} .fv-code-line-content {
      white-space: pre;
    }

    .${className} .token.comment,
    .${className} .token.prolog,
    .${className} .token.doctype,
    .${className} .token.cdata {
      color: ${palette.comment};
      font-style: italic;
    }

    .${className} .token.punctuation {
      color: ${palette.punctuation};
    }

    .${className} .token.namespace {
      opacity: 0.85;
    }

    .${className} .token.property,
    .${className} .token.symbol,
    .${className} .token.deleted,
    .${className} .token.constant,
    .${className} .token.variable,
    .${className} .token.parameter {
      color: ${palette.property};
    }

    .${className} .token.boolean,
    .${className} .token.number {
      color: ${palette.number};
    }

    .${className} .token.selector,
    .${className} .token.string,
    .${className} .token.char,
    .${className} .token.builtin,
    .${className} .token.inserted {
      color: ${palette.string};
    }

    .${className} .token.operator,
    .${className} .token.entity,
    .${className} .token.url {
      color: ${palette.operator};
    }

    .${className} .token.atrule,
    .${className} .token.attr-value,
    .${className} .token.keyword {
      color: ${palette.keyword};
    }

    .${className} .token.function,
    .${className} .token.function-variable {
      color: ${palette.function};
    }

    .${className} .token.class-name,
    .${className} .token.maybe-class-name {
      color: ${palette.className};
    }

    .${className} .token.regex,
    .${className} .token.important {
      color: ${palette.regex};
    }

    .${className} .token.tag {
      color: ${palette.tag};
    }

    .${className} .token.attr-name {
      color: ${palette.attrName};
    }

    .${className} .token.attr-value {
      color: ${palette.attrValue};
    }

    .${className} .token.bold,
    .${className} .token.important {
      font-weight: 600;
    }

    .${className} .token.italic {
      font-style: italic;
    }
  `;
}

export function splitSourceLines(value: string): string[] {
  return value.replace(/\r\n/g, "\n").split("\n");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
