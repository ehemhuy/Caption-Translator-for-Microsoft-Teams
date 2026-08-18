# Privacy Policy — Caption Translator for Microsoft Teams

_Last updated: 18 August 2026_

This extension is free and open source. It has no backend server, no analytics,
and no developer-operated infrastructure of any kind.

## What the extension does with your data

**Caption text.** While enabled on a Microsoft Teams meeting page, the extension
reads the live caption text shown on screen and sends it to the translation
endpoint **that you configure yourself** in the extension options (for example
`http://localhost:11434/v1` for a local Ollama instance). The translated text is
displayed next to the caption and then discarded. Nothing is written to disk and
nothing is sent anywhere else.

The developer never receives your caption text. Where it goes is entirely
determined by the URL you enter. If you point the extension at a local server,
the text never leaves your machine; if you point it at a third-party API such as
OpenAI, that provider's own privacy policy applies to it.

**Your settings.** The endpoint URL, model name, system prompt, CSS selectors and
API key you enter are stored using `chrome.storage.sync`, which keeps them in
your own browser profile and, if you have Chrome sync turned on, in your own
Google account. They are never transmitted to the developer. The API key is sent
only to the endpoint you configured, as an `Authorization` header, in order to
authenticate your own request.

## What the extension does not do

- No data is collected, stored, or transmitted for the developer's benefit.
- No data is sold or shared with third parties.
- No analytics, telemetry, tracking, advertising, or fingerprinting.
- No data is used for credit assessment, lending, or any purpose unrelated to
  the single purpose of translating captions.

## Permissions and why they are needed

| Permission | Why |
| --- | --- |
| `storage` | Save your own settings (endpoint, model, prompt, API key). |
| `declarativeNetRequestWithHostAccess` | Remove the `Origin: chrome-extension://…` header from the extension's own translation requests. Many LLM gateways reject that header with HTTP 403, and `fetch()` cannot remove it. The rule is scoped to the API host you configured and to requests originating from the extension itself (`tabIds: [-1]`); it never touches requests made by the Teams page or any other website. |
| `optional_host_permissions` (`<all_urls>`) | Declared as **optional**, so no host access is granted at install time. You choose your own translation endpoint, so the host cannot be known in advance — it may be `localhost`, a machine on your LAN, a self-hosted server, or a commercial API. When you press Save in the options page, the extension requests access to that one origin only, and Chrome shows you the prompt. It never contacts any other host. |
| Content script on Teams domains | Read caption text from the meeting page and display the translation next to it. |

## Data retention

None. Caption text lives in memory only for the duration of the translation
request. Your settings remain in your browser until you change them or uninstall
the extension.

## Third parties

The extension has no third-party dependencies and contacts no service other than
the endpoint you configure.

## Not affiliated with Microsoft

This is an independent project. It is not affiliated with, endorsed by, or
sponsored by Microsoft Corporation. "Microsoft Teams" is a trademark of
Microsoft Corporation.

## Changes

Any change to this policy will be published at this URL with an updated date.

## Contact

Questions or requests: ehemhuy@gmail.com
