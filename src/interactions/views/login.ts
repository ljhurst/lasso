export function renderLogin(uid: string, error?: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Lasso — Sign in</title>
  </head>
  <body>
    <h1>Sign in</h1>
    ${error ? `<p role="alert">${error}</p>` : ''}
    <form method="post" action="/interaction/${uid}/login">
      <label>Username <input type="text" name="username" required /></label>
      <label>Password <input type="password" name="password" required /></label>
      <button type="submit">Sign in</button>
    </form>
  </body>
</html>`;
}
