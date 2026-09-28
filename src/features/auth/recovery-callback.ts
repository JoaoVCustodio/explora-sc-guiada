export function hasRecoveryCallbackError(href: string): boolean {
  const url = new URL(href);
  const parameters = [url.searchParams, new URLSearchParams(url.hash.slice(1))];

  return parameters.some((params) =>
    params.has("error") || params.has("error_code") || params.has("error_description"),
  );
}
