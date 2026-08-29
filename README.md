<h1 align="center">Sub Manager</h1>

<p align="center">A panel for managing proxy subscriptions and configs on Cloudflare Workers</p>

### 🌏 Readme in Farsi: <a href="README_fa.md">README_fa.md</a>

<br>

## Overview

Sub Manager is a self-hosted panel for aggregating proxy subscriptions and configs (VLESS, Trojan, Shadowsocks, VMess) into a single output link, with per-config processing applied on top — clean-IP substitution, port filtering, upload-boost, and more. It runs as a single Cloudflare Worker backed by one KV namespace, with no external server, database, or cost beyond Cloudflare's free tier for typical personal use.

## Features

- **Multi-source aggregation** — combine subscription URLs and manually-pasted configs into one output.
- **Clean-IP substitution** — swap each config's address for one from a managed IP list, in `multiply` mode (one output config per IP) or `random` mode (one random IP per config).
- **Per-part configuration** — each source, or each URL within a source, has independent settings: clean-IP list, port filtering, one-config-per-port, and Cloudflare-range restriction.
- **Self-refreshing sources** — each URL source refreshes on its own interval, triggered lazily on the next client request past due time. No Cron Trigger is required, though one can be added for proactive background refresh.
- **Backup / restore** — export sources, clean-IP lists, and Cloudflare connections to a single JSON file; re-import later in merge or replace mode.
- **Cloudflare usage stats** — optionally attach a Cloudflare API token to show the Worker's daily request count in the panel.
- **Upload-boost** — sets TLS `fingerprint` and `cipherSuites` on VLESS/Trojan configs, based on the method from [Patterniha](https://github.com/patterniha)'s [v2rayNG pull request](https://github.com/2dust/v2rayNG/pull/5900).
- **Per-config controls** — rename, reorder, and temporarily disable individual configs within a source without deleting them.

## Limitations

- Not a proxy implementation — the Worker doesn't handle VLESS/Trojan/Shadowsocks traffic itself. It only stores, merges, and republishes configs that already point to a working upstream.
- Cloudflare's free plan includes 100,000 KV reads and 1,000 KV writes per day, shared across the entire Worker. Sufficient for personal use; a factor if serving a large number of subscription requests.
- Each part (a URL, or the manual-configs group) holds at most 1,000 base configs. After clean-IP multiplication, a part's final output is capped at 6,000 lines; configs beyond that are randomly sampled rather than all included.
- Fetching a subscription URL times out after 15 seconds; unreachable or slow sources are marked failed rather than blocking the request.

## Deploy

Requires only a free Cloudflare account.

1. **Create a KV namespace.** Cloudflare dashboard → **Workers & Pages** → **KV** → **Create namespace**. The name is arbitrary, e.g. `sub-manager-db`.
2. **Create a Worker.** **Workers & Pages** → **Create** → **Workers**, enter a name, then **Deploy**. The default template code is overwritten in step 4.
3. **Bind the KV namespace.** Open the Worker → **Settings** → **Bindings** → **Add binding** → **KV namespace**. Set **Variable name** to exactly `SUB_DB`, select the namespace created in step 1, then **Save**.
4. **Deploy the code.** Download `worker.js` from [Releases](https://github.com/Yarumin/sub-manager/releases). Open the Worker's **Edit code** view, replace the existing contents with the downloaded file, then **Deploy**.
5. **Set the admin password.** Worker → **Settings** → **Variables and Secrets** → **Add**. Type: **Secret**, name: `ADMIN_PASSWORD`, value: a password of your choice. **Save and deploy**.

   > If `ADMIN_PASSWORD` is not set, the panel falls back to the default password `admin123` and displays a warning banner until a Secret is configured. The default is intended for a first look only.

6. Navigate to `https://<worker-name>.<subdomain>.workers.dev/app` and sign in to start adding sources.

No further configuration is required.

### Updating to a new release

Repeating steps 4 and, if needed, 5 is sufficient — replacing the Worker's code does not affect data already stored in the KV namespace (sources, clean-IP lists, Cloudflare connections).

### Optional: Cron Trigger

Sources already refresh on the next request past their due time. A Cron Trigger additionally makes that refresh happen proactively in the background: Worker → **Settings** → **Triggers** → **Cron Triggers** → **Add Cron Trigger**, e.g. `0 * * * *` for hourly.

## Building from source

Building the Worker file locally, or deploying directly from the modular source with [Wrangler](https://developers.cloudflare.com/workers/wrangler/), is documented in [README_fa.md](README_fa.md#اجرا-از-روی-سورس). The commands are language-independent; downloading the pre-built `worker.js` from [Releases](https://github.com/Yarumin/sub-manager/releases) is sufficient for most users.

## Project structure

```
src/
  index.js          entry point (fetch / scheduled)
  constants.js
  utils/             stateless helpers
  authz/             session, password verification, login rate-limit
  configEngine/      config parsing, fingerprinting, output generation
  storage/           KV read/write, backup import/export
  sync/              subscription fetching and auto-refresh
  api/               /api/* route handlers
  publicApi/         /sub/{slug} public endpoint
  panel/             admin panel HTML + client-side script
scripts/
  build.mjs          bundles src/ into dist/worker.js
wrangler.jsonc       config for `wrangler dev` / `wrangler deploy`
```

---

## License

MIT — see [LICENSE](./LICENSE).
