<h1 align="center">Sub Manager</h1>

<p align="center">A panel for managing proxy subscriptions and configs on Cloudflare Workers</p>

<p align="center"><a href="README_fa.md">فارسی</a></p>

<br>

Sub Manager merges proxy subscription URLs and manually-added configs (VLESS, Trojan, Shadowsocks, VMess) into a single output link, applying per-config processing such as clean-IP substitution, port filtering, and TLS adjustments along the way. It runs as a single Cloudflare Worker with one KV namespace for storage.

## Features

- Merges multiple subscription URLs and manual configs into one output.
- Substitutes each config's address with a clean IP from a managed list, either multiplying across every IP or picking one at random per config.
- Per-source and per-URL settings: clean-IP list, port filtering, one-config-per-port, restricting substitution to Cloudflare's known IP ranges.
- Auto-refreshes each URL source on its own interval, triggered on the next request past due time — no Cron Trigger required.
- Exports and imports sources, clean-IP lists, and Cloudflare connections as a single JSON backup, with merge or replace options.
- Shows the Worker's daily request count in the panel, if a Cloudflare API token is connected.
- Upload-boost: sets TLS fingerprint and cipher suites on VLESS/Trojan configs, using the method [Patterniha](https://github.com/patterniha) contributed to v2rayNG in [PR #5900](https://github.com/2dust/v2rayNG/pull/5900).
- Rename, reorder, or temporarily disable individual configs without deleting them.

## Limitations

- Not a proxy implementation — the Worker doesn't handle VLESS/Trojan/Shadowsocks traffic itself; it only stores, merges, and republishes configs that point to a working destination.
- Cloudflare's free plan includes 100,000 KV reads and 1,000 KV writes per day, shared across the Worker. Sufficient for personal use.
- Each part holds up to 1,000 base configs; after clean-IP multiplication, output is capped at 6,000 lines per part, with excess sampled at random.
- Subscription URL fetches time out after 15 seconds; unreachable sources are marked as failed.

## Deployment

Requires a free Cloudflare account.

Create a new Worker and download `worker.js` from [Releases](https://github.com/Yarumin/sub-manager/releases), then deploy it to that Worker.

From **Storage & Databases → Workers KV**, create a KV namespace with any name you like.

In the Worker's settings, go to **Bindings** and add a KV binding named exactly `SUB_DB`, pointing to the namespace created in the previous step. Then go back to **Settings → Variables and Secrets** and add a secret named `ADMIN_PASSWORD` with a password of your choice, and deploy. Without this step, the panel runs on the default password `admin123` and shows a warning until a real one is set. (If the password doesn't seem to work, try changing the Worker's Compatibility Date to `2026-08-04`.)

The panel is available by adding `/app` to the end of the Worker's URL (`https://<worker-name>.<subdomain>.workers.dev/app`).

A Cron Trigger is optional. Without one, a client always gets the previously cached output, and an overdue source only refreshes in the background after that request, so the update shows up on the next fetch. With a Cron Trigger, sources refresh on their own schedule in the background, so the cached output is more likely to already be current when a client asks for it. It can be added under **Settings → Triggers**, for example with the schedule `0 * * * *` for once an hour.

Updating to a new version only requires repeating the deploy step with the new `worker.js`; data already stored in KV is unaffected.

## Building from source

Downloading `worker.js` from Releases is sufficient for most users. For building locally or deploying with Wrangler, see [README_fa.md](README_fa.md) — the commands are the same regardless of language.

## Code layout

```
src/
  index.js          entry point (fetch / scheduled)
  constants.js
  utils/             stateless helpers
  authz/             session, password verification, login rate-limit
  configEngine/      config parsing, fingerprinting, output generation
  storage/           KV read/write, backup import/export
  sync/              subscription fetching, auto-refresh
  api/               /api/* route handlers
  publicApi/         /sub/{slug} public endpoint
  panel/             admin panel HTML and client script
scripts/
  build.mjs          bundles src/ into dist/worker.js
```

## License

MIT — see [LICENSE](./LICENSE).
