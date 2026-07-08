# Privacy Policy · readto Chrome Extension

**Last updated**: 2026-07-08

## Summary

**readto does not collect, store, or transmit any user browsing data.** All translation happens locally by default. Optional LLM-based translation only sends the specific words you have configured to your chosen provider.

## Data readto handles

| Data | Where it lives | Sent off-device? |
|---|---|:-:|
| Your CEFR level preference | `chrome.storage.local` (on your device) | ❌ No |
| Local translation dictionary (~200KB JSON) | Bundled inside the extension | ❌ No (loaded from extension package) |
| LLM endpoint URL / model name | `chrome.storage.local` | ❌ No |
| LLM API key | `chrome.storage.local` | ❌ Never leaves your device except in the `Authorization: Bearer …` header of requests you initiate to *your own* configured endpoint |
| Web pages you visit | Only scanned in-memory to find translatable words | ❌ No — never sent anywhere |

## LLM mode (opt-in)

If you enable LLM translation:

- You explicitly provide an endpoint URL (e.g. `https://api.openai.com/v1/chat/completions`) and API key.
- Only the specific words that exceed your CEFR threshold are sent to that endpoint, batched.
- readto does **not** send full page content, URLs, or any identifying metadata.
- Errors returned from your LLM provider are sanitized to redact API keys before display, so a leaky upstream error cannot leak your credentials to the current page.

## Permissions requested

- **`storage`** — persist your level preference and (optional) LLM config on-device only.
- **`optional_host_permissions: http://*/*, https://*/*`** — requested on-demand only when you enable LLM mode; needed to `fetch()` to your configured endpoint. Not granted at install.

## Third parties

readto has **no analytics, no telemetry, no crash reporting, no ads, no A/B testing**. Zero network calls other than:
1. Loading the extension's own bundled dictionary (extension-internal, offline).
2. LLM API calls you explicitly opt into and configure.

## Open source

readto is fully open source under MIT. You can audit every network call by inspecting the source:
- Repository: <https://github.com/gandli/readto-chrome-extension>
- Security policy: [.github/SECURITY.md](.github/SECURITY.md)

## Contact

Report privacy concerns via GitHub Issues or the SECURITY.md disclosure channel.
