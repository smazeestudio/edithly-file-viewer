import type { FileViewerTheme } from "../types";

const SEARCH_MATCH_SELECTOR = 'mark[data-file-viewer-search-match="true"]';
const SKIP_SELECTOR = [
  "script",
  "style",
  "noscript",
  "canvas",
  "svg",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "[aria-hidden='true']",
  "[data-file-viewer-search-ignore]",
  SEARCH_MATCH_SELECTOR,
].join(",");

type SearchPalette = {
  background: string;
  color: string;
  activeBackground: string;
  activeColor: string;
  activeOutline: string;
};

export function collectSearchRoots(container: HTMLElement): HTMLElement[] {
  const roots: HTMLElement[] = [container];

  for (const iframe of container.querySelectorAll("iframe")) {
    try {
      const iframeBody = iframe.contentDocument?.body;
      if (iframeBody) {
        roots.push(iframeBody);
      }
    } catch {
      // Ignore cross-origin or inaccessible frames.
    }
  }

  return roots;
}

export function clearSearchMatches(roots: HTMLElement[]): void {
  for (const root of roots) {
    const matches = Array.from(root.querySelectorAll<HTMLElement>(SEARCH_MATCH_SELECTOR));
    for (const match of matches) {
      const parent = match.parentNode;
      if (!parent) {
        continue;
      }

      parent.replaceChild(root.ownerDocument.createTextNode(match.textContent ?? ""), match);
      parent.normalize();
    }
  }
}

export function createSearchMatches(
  roots: HTMLElement[],
  query: string,
  theme: FileViewerTheme,
): HTMLElement[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const matches: HTMLElement[] = [];

  for (const root of roots) {
    const textNodes = collectTextNodes(root);
    if (textNodes.length === 0) {
      continue;
    }

    const {
      combinedText,
      combinedLower,
      combinedMap,
    } = buildCombinedSearchText(textNodes);

    if (!combinedText) {
      continue;
    }

    const segmentsByNode = new Map<
      number,
      Array<{ start: number; end: number; order: number }>
    >();
    let matchOrder = 0;
    let searchIndex = 0;

    while (searchIndex < combinedLower.length) {
      const matchIndex = combinedLower.indexOf(normalizedQuery, searchIndex);
      if (matchIndex === -1) {
        break;
      }

      collectSegmentsForMatch(
        combinedMap,
        matchIndex,
        matchIndex + normalizedQuery.length,
        matchOrder,
        segmentsByNode,
      );
      matchOrder += 1;
      searchIndex = matchIndex + normalizedQuery.length;
    }

    if (segmentsByNode.size === 0) {
      continue;
    }

    for (const [nodeIndex, rawSegments] of segmentsByNode.entries()) {
      const node = textNodes[nodeIndex];
      const text = node.nodeValue ?? "";
      const segments = mergeNodeSegments(rawSegments);
      const fragment = root.ownerDocument.createDocumentFragment();
      let cursor = 0;

      for (const segment of segments) {
        if (segment.start > cursor) {
          fragment.appendChild(root.ownerDocument.createTextNode(text.slice(cursor, segment.start)));
        }

        const match = root.ownerDocument.createElement("mark");
        match.dataset.fileViewerSearchMatch = "true";
        match.dataset.fileViewerSearchOrder = String(segment.order);
        match.textContent = text.slice(segment.start, segment.end);
        applySearchMatchStyle(match, theme, false);
        fragment.appendChild(match);
        cursor = segment.end;
      }

      if (cursor < text.length) {
        fragment.appendChild(root.ownerDocument.createTextNode(text.slice(cursor)));
      }

      node.parentNode?.replaceChild(fragment, node);
    }

    const rootMatches = Array.from(root.querySelectorAll<HTMLElement>(SEARCH_MATCH_SELECTOR)).sort(
      (left, right) =>
        Number(left.dataset.fileViewerSearchOrder ?? "0") -
        Number(right.dataset.fileViewerSearchOrder ?? "0"),
    );
    matches.push(...rootMatches);
  }

  return matches;
}

export function setActiveSearchMatch(
  matches: HTMLElement[],
  activeIndex: number,
  theme: FileViewerTheme,
): void {
  for (const [index, match] of matches.entries()) {
    applySearchMatchStyle(match, theme, index === activeIndex);
  }

  const activeMatch = matches[activeIndex];
  activeMatch?.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

function collectTextNodes(root: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node.nodeType !== Node.TEXT_NODE) {
          return NodeFilter.FILTER_REJECT;
        }

        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        const parentElement = node.parentElement;
        if (!parentElement) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parentElement.closest(SKIP_SELECTOR)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  return textNodes;
}

function buildCombinedSearchText(textNodes: Text[]): {
  combinedText: string;
  combinedLower: string;
  combinedMap: Array<{ nodeIndex: number; offset: number } | null>;
} {
  let combinedText = "";
  const combinedMap: Array<{ nodeIndex: number; offset: number } | null> = [];

  for (const [nodeIndex, textNode] of textNodes.entries()) {
    const text = textNode.nodeValue ?? "";
    if (!text) {
      continue;
    }

    if (combinedText.length > 0 && needsWhitespaceBridge(combinedText, text)) {
      combinedText += " ";
      combinedMap.push(null);
    }

    for (let offset = 0; offset < text.length; offset += 1) {
      combinedText += text[offset];
      combinedMap.push({ nodeIndex, offset });
    }
  }

  const combinedLower = normalizeSearchText(combinedText);
  if (combinedLower === combinedText.toLocaleLowerCase()) {
    return { combinedText, combinedLower, combinedMap };
  }

  const rebuiltMap: Array<{ nodeIndex: number; offset: number } | null> = [];
  let normalizedText = "";
  let pendingWhitespace = false;
  let pendingWhitespaceRef: { nodeIndex: number; offset: number } | null = null;

  for (let index = 0; index < combinedText.length; index += 1) {
    const character = combinedText[index];
    const ref = combinedMap[index];

    if (/\s/.test(character)) {
      pendingWhitespace = normalizedText.length > 0;
      if (ref) {
        pendingWhitespaceRef = ref;
      }
      continue;
    }

    if (pendingWhitespace) {
      normalizedText += " ";
      rebuiltMap.push(pendingWhitespaceRef);
      pendingWhitespace = false;
      pendingWhitespaceRef = null;
    }

    normalizedText += character;
    rebuiltMap.push(ref);
  }

  return {
    combinedText: normalizedText,
    combinedLower: normalizedText.toLocaleLowerCase(),
    combinedMap: rebuiltMap,
  };
}

function collectSegmentsForMatch(
  combinedMap: Array<{ nodeIndex: number; offset: number } | null>,
  startIndex: number,
  endIndex: number,
  order: number,
  segmentsByNode: Map<number, Array<{ start: number; end: number; order: number }>>,
): void {
  let currentNodeIndex: number | null = null;
  let currentStart = -1;
  let previousOffset = -1;

  function flushCurrentSegment() {
    if (currentNodeIndex === null || currentStart < 0) {
      return;
    }

    const segments = segmentsByNode.get(currentNodeIndex) ?? [];
    segments.push({
      start: currentStart,
      end: previousOffset + 1,
      order,
    });
    segmentsByNode.set(currentNodeIndex, segments);
    currentNodeIndex = null;
    currentStart = -1;
    previousOffset = -1;
  }

  for (let index = startIndex; index < endIndex; index += 1) {
    const ref = combinedMap[index];
    if (!ref) {
      flushCurrentSegment();
      continue;
    }

    if (
      currentNodeIndex === ref.nodeIndex &&
      previousOffset >= 0 &&
      ref.offset === previousOffset + 1
    ) {
      previousOffset = ref.offset;
      continue;
    }

    flushCurrentSegment();
    currentNodeIndex = ref.nodeIndex;
    currentStart = ref.offset;
    previousOffset = ref.offset;
  }

  flushCurrentSegment();
}

function mergeNodeSegments(
  segments: Array<{ start: number; end: number; order: number }>,
): Array<{ start: number; end: number; order: number }> {
  const sortedSegments = [...segments].sort((left, right) => left.start - right.start);
  const merged: Array<{ start: number; end: number; order: number }> = [];

  for (const segment of sortedSegments) {
    const previous = merged[merged.length - 1];
    if (previous && segment.start < previous.end) {
      previous.end = Math.max(previous.end, segment.end);
      continue;
    }
    merged.push({ ...segment });
  }

  return merged;
}

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function needsWhitespaceBridge(current: string, next: string): boolean {
  const currentLast = current[current.length - 1];
  const nextFirst = next[0];
  return Boolean(currentLast && nextFirst && !/\s/.test(currentLast) && !/\s/.test(nextFirst));
}

function applySearchMatchStyle(
  match: HTMLElement,
  theme: FileViewerTheme,
  active: boolean,
): void {
  const palette = getSearchPalette(theme);

  match.style.backgroundColor = active ? palette.activeBackground : palette.background;
  match.style.color = active ? palette.activeColor : palette.color;
  match.style.padding = "0 0.08em";
  match.style.borderRadius = "3px";
  match.style.boxShadow = active ? `0 0 0 1px ${palette.activeOutline}` : "none";
}

function getSearchPalette(theme: FileViewerTheme): SearchPalette {
  if (theme === "dark") {
    return {
      background: "rgba(250, 204, 21, 0.3)",
      color: "#fef3c7",
      activeBackground: "#f59e0b",
      activeColor: "#111827",
      activeOutline: "rgba(254, 243, 199, 0.55)",
    };
  }

  return {
    background: "#fef08a",
    color: "#1f2937",
    activeBackground: "#f59e0b",
    activeColor: "#111827",
    activeOutline: "rgba(180, 83, 9, 0.45)",
  };
}
