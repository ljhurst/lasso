import type { Children } from '@kitajs/html';
import pkg from '#package.json' with { type: 'json' };
import { APPLE_TOUCH_ICON_HREF, FAVICON_HREF, LassoMark, THEME_STYLES } from '#src/branding.tsx';

const AUTH_STYLES = `
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
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
    position: relative;
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

  button:disabled {
    cursor: default;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 24px;
  }

  .actions button {
    margin-top: 0;
  }

  button.secondary {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
  }

  button.secondary:hover {
    filter: none;
    background: var(--bg);
  }

  .meta {
    margin: 0;
    text-align: center;
    font-size: 0.8125rem;
    color: var(--muted);
  }

  .meta:last-child {
    margin-top: 20px;
  }

  button .spinner {
    display: none;
  }

  button.loading .label {
    visibility: hidden;
  }

  button.loading .spinner {
    display: block;
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    margin: -8px;
    border: 2px solid var(--accent-contrast);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Disable the submit button *after* the browser has serialized the form —
// disabling it synchronously drops the clicked button's own name/value from
// the POST, which breaks the logout page's "logout=yes".
const SUBMIT_LOADING_SCRIPT = `
  document.querySelector('form').addEventListener('submit', function (e) {
    var btn = e.submitter || document.querySelector('button[type="submit"]');
    btn.classList.add('loading');
    setTimeout(function () { btn.disabled = true; }, 0);
  });
`;

export function AuthLayout(props: {
  title: string;
  heading: string;
  subtitle?: string;
  error?: string;
  children: Children;
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Lasso — {props.title}</title>
        <link rel="icon" type="image/svg+xml" href={FAVICON_HREF} />
        <link rel="apple-touch-icon" href={APPLE_TOUCH_ICON_HREF} />
        <meta name="apple-mobile-web-app-title" content="Lasso" />
        <style>{THEME_STYLES + AUTH_STYLES}</style>
      </head>
      <body>
        <div class="card">
          <div class="mark">
            <LassoMark />
          </div>
          <h1>{props.heading}</h1>
          {props.subtitle ? <p class="subtitle">{props.subtitle}</p> : ''}
          {props.error ? (
            <p class="alert" role="alert">
              {props.error}
            </p>
          ) : (
            ''
          )}
          {props.children}
          <p class="meta">v{pkg.version}</p>
        </div>
        <script>{SUBMIT_LOADING_SCRIPT}</script>
      </body>
    </html>
  );
}

export function SubmitButton(props: { label: string }) {
  return (
    <button type="submit">
      <span class="label">{props.label}</span>
      <span class="spinner" aria-hidden="true" />
    </button>
  );
}
