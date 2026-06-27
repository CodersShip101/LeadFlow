// Vercel Cron invokes routes with a GET request and, when the CRON_SECRET env
// var is set, includes `Authorization: Bearer <CRON_SECRET>`. This guards the
// scrape endpoints so only the scheduler (or someone with the secret) can
// trigger an expensive run.
//
// If CRON_SECRET is not configured yet, we allow the call so scraping works out
// of the box — but set CRON_SECRET in production to lock it down.
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}
