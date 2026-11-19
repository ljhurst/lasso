/** A resource indicator is a URL, so pages address it by an encoding that is safe inside a path. */
export function resourceId(indicator: string): string {
  return Buffer.from(indicator, 'utf8').toString('base64url');
}

export function indicatorFromId(id: string): string | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return undefined;
  }
  const decoded = Buffer.from(id, 'base64url').toString('utf8');
  return URL.canParse(decoded) && resourceId(decoded) === id ? decoded : undefined;
}
