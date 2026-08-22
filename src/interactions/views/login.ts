const LASSO_MARK = `<svg width="52" height="52" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="30" cy="24" rx="17" ry="13" stroke="currentColor" stroke-width="3.5" fill="none"
           stroke-dasharray="82 8" stroke-dashoffset="20" stroke-linecap="round"/>
  <path d="M16 33 C14 40 20 48 28 50 C34 51 36 47 32 44"
        stroke="currentColor" stroke-width="3.5" stroke-linecap="round" fill="none"/>
</svg>`;

export function renderLogin(uid: string, error?: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lasso — Sign in</title>
    <style>
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
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg);
        color: var(--text);
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }

      .card {
        width: 100%;
        max-width: 380px;
        margin: 24px;
        padding: 40px 36px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.25);
      }

      .mark {
        display: flex;
        justify-content: center;
        color: var(--accent);
        margin-bottom: 12px;
      }

      h1 {
        margin: 0 0 4px;
        font-size: 1.375rem;
        font-weight: 600;
        text-align: center;
      }

      .subtitle {
        margin: 0 0 28px;
        color: var(--muted);
        font-size: 0.875rem;
        text-align: center;
      }

      .alert {
        margin: 0 0 20px;
        padding: 10px 14px;
        border-radius: 10px;
        background: var(--error-bg);
        border: 1px solid var(--error-border);
        color: var(--error-text);
        font-size: 0.875rem;
      }

      label {
        display: block;
        font-size: 0.8125rem;
        font-weight: 600;
        margin-bottom: 6px;
      }

      label + label {
        margin-top: 16px;
      }

      input {
        width: 100%;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: var(--bg);
        color: var(--text);
        font-size: 0.9375rem;
      }

      input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
      }

      button {
        width: 100%;
        margin-top: 24px;
        padding: 11px 12px;
        border: none;
        border-radius: 10px;
        background: var(--accent);
        color: var(--accent-contrast);
        font-size: 0.9375rem;
        font-weight: 600;
        cursor: pointer;
      }

      button:hover {
        filter: brightness(1.05);
      }

      button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="mark">${LASSO_MARK}</div>
      <h1>Sign in</h1>
      <p class="subtitle">Lasso</p>
      ${error ? `<p class="alert" role="alert">${error}</p>` : ''}
      <form method="post" action="/interaction/${uid}/login">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" autocomplete="username" required />
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          autocomplete="current-password"
          required
        />
        <button type="submit">Sign in</button>
      </form>
    </div>
  </body>
</html>`;
}
