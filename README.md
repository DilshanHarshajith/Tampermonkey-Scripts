# Tampermonkey Scripts

A collection of small, practical userscripts by [@DilshanHarshajith](https://github.com/DilshanHarshajith), maintained in one place. Each script has its own page in [`docs/`](docs/) with installation notes, shortcuts, and configuration details.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or another compatible userscript manager.
2. Pick a script below and use its **Install** link to open the raw `.user.js` file.
3. Confirm the installation in your userscript manager and reload the page where you want to use it.

## Scripts

<!-- BEGIN SCRIPTS -->

_This section is generated from [`docs/`](docs/) by [`scripts/build-readme.mjs`](scripts/build-readme.mjs). Edit the docs, not this section._

### [Video Keyboard Controls](docs/video-keyboard-controls.md)

Space = play/pause, Left/Right = seek 10s, Up/Down = playback speed ±5% (hold to repeat). · `1.1.0`

[Documentation](docs/video-keyboard-controls.md) · [Install](https://raw.githubusercontent.com/DilshanHarshajith/Tampermonkey-Scripts/main/video-keyboard-controls.user.js)

<!-- END SCRIPTS -->

## Add a script

1. Add the userscript as `<script-name>.user.js` in the repository root, with a complete `==UserScript==` header (name, version, description, match rules, and `@license`).
2. Add `docs/<script-name>.md` with YAML front matter. `title`, `file`, and `description` are required; `version` is optional and falls back to the script's `@version`:

   ```markdown
   ---
   title: My Script
   file: my-script.user.js
   description: One sentence describing what the script does.
   ---
   
   # My Script
   
   Full documentation goes here.
   ```

3. Run `node scripts/build-readme.mjs` (or `npm run docs:sync`) to refresh the list above. The docs are the single source of truth for descriptions — never edit the generated section by hand.

## Keeping the README in sync

The **Scripts** section above is generated from the front matter of every file in [`docs/`](docs/). [`scripts/build-readme.mjs`](scripts/build-readme.mjs) has no dependencies:

```bash
npm run docs:sync   # regenerate README.md
npm run docs:check  # verify it is up to date (used in CI)
```

GitHub Actions regenerates and commits `README.md` when the docs, scripts, or generator change on `main`, and checks on pull requests that the generated section is current. The generator also warns when a doc's title, description, or version disagrees with the userscript header.

## License

All scripts are licensed under [GPL-3.0-or-later](LICENSE).
