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
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const matches: HTMLElement[] = [];

  for (const root of roots) {
    const textNodes = collectTextNodes(root);

    for (const textNode of textNodes) {
      const sourceText = textNode.nodeValue ?? "";
      const sourceLower = sourceText.toLocaleLowerCase();
      let searchIndex = 0;
      let matchIndex = sourceLower.indexOf(normalizedQuery, searchIndex);

      if (matchIndex === -1) {
        continue;
      }

      const fragment = root.ownerDocument.createDocumentFragment();

      while (matchIndex !== -1) {
        if (matchIndex > searchIndex) {
          fragment.appendChild(
            root.ownerDocument.createTextNode(sourceText.slice(searchIndex, matchIndex)),
          );
        }

        const match = root.ownerDocument.createElement("mark");
        match.dataset.fileViewerSearchMatch = "true";
        match.textContent = sourceText.slice(matchIndex, matchIndex + normalizedQuery.length);
        applySearchMatchStyle(match, theme, false);
        fragment.appendChild(match);
        matches.push(match);

        searchIndex = matchIndex + normalizedQuery.length;
        matchIndex = sourceLower.indexOf(normalizedQuery, searchIndex);
      }

      if (searchIndex < sourceText.length) {
        fragment.appendChild(root.ownerDocument.createTextNode(sourceText.slice(searchIndex)));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }
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
