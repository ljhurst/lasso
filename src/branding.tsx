export function LassoMark() {
  return (
    <svg width="52" height="52" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <ellipse
        cx="30"
        cy="24"
        rx="17"
        ry="13"
        stroke="currentColor"
        stroke-width="3.5"
        fill="none"
        stroke-dasharray="82 8"
        stroke-dashoffset="20"
        stroke-linecap="round"
      />
      <path
        d="M16 33 C14 40 20 48 28 50 C34 51 36 47 32 44"
        stroke="currentColor"
        stroke-width="3.5"
        stroke-linecap="round"
        fill="none"
      />
    </svg>
  );
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <ellipse cx="30" cy="24" rx="17" ry="13" stroke="#b5622c" stroke-width="4" fill="none"
           stroke-dasharray="82 8" stroke-dashoffset="20" stroke-linecap="round"/>
  <path d="M16 33 C14 40 20 48 28 50 C34 51 36 47 32 44"
        stroke="#b5622c" stroke-width="4" stroke-linecap="round" fill="none"/>
</svg>`;

export const FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`;

export const THEME_STYLES = `
  :root {
    --bg: #f4f1ec;
    --card: #ffffff;
    --border: #e5ded2;
    --text: #2a2620;
    --muted: #7a7266;
    --accent: #b5622c;
    --accent-contrast: #ffffff;
    --error-bg: #fbeae6;
    --error-text: #9a3412;
    --error-border: #f0c4b6;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1815;
      --card: #242019;
      --border: #3a352c;
      --text: #f2ede4;
      --muted: #a89f8f;
      --accent: #d97a3f;
      --accent-contrast: #1a1815;
      --error-bg: #3a2019;
      --error-text: #f3b8a3;
      --error-border: #5c2e21;
    }
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
`;
