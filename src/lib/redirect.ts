/** Where to go after signing in: a same-site path from ?next=, else home. Rejects other sites ("//evil.com", "https://..."). */
export const safeNext = (next: string | null) => (next && /^\/(?![/\\])/.test(next) ? next : '/');
