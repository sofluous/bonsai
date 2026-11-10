# Polygon Bonsai

Browser bonsai generator with configurable plant/scene controls, snapshots, and exports. Hub/expansion scaffolds coexist with the main Bonsai runtime; the sandbox is experimental.

From this directory, serve over HTTP with Python 3:

```text
python -m http.server 5500 --bind 127.0.0.1
```

Open `http://127.0.0.1:5500/`; stop with Ctrl+C. Three.js, controls, and optional export libraries use CDNs, so network availability affects those paths. No package installation/build is configured for serving the existing app.

With Node.js (validated with 24.14.1), check modules from this directory:

```powershell
Get-ChildItem js -Recurse -File -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { throw "Syntax check failed" } }
```

State regressions: `node --test tests/ui-state.test.cjs tests/save-state.test.cjs tests/export-state.test.cjs`. Optional browser acceptance: `node tests/ui.browser.cjs` with `playwright-core` and installed Edge; set `BONSAI_PLAYWRIGHT` to an external driver module path and optionally `BONSAI_SCREENSHOT` to a PNG output path. The browser check starts/stops its own local server and requires access to the existing CDNs.

Lighting acceptance: `node tests/lighting.browser.cjs` uses the same Edge/driver setup. Optional `BONSAI_LIGHTING_OUTPUT` writes comparisons into an existing directory. It verifies fixed-seed brightness, background/preset/rotation cases and legacy numerical lighting recall.

Save fidelity: `node tests/save.browser.cjs` uses the same Edge/driver setup. Optional `BONSAI_SAVE_REPORT` writes JSON evidence. It checks UI Save/Recall, JSON export/fresh import, IndexedDB reload, historical fixtures, namespaced-only records, malformed/duplicate inputs and cross-viewport geometry budgets. `tests/fixtures/` contains the two required historical records with preview images removed.

Export acceptance: `node tests/export.browser.cjs` uses the same Edge/driver setup and real CDN codecs. Optional `BONSAI_EXPORT_OUTPUT` writes images/models/GIF and JSON evidence into an existing directory. Covers sizes/crops/alpha, native/GLB geometry reloads, decoded loop timing, live scene preservation and resource failure/retry. Image exports resample the current viewport; opaque backgrounds use the selected base color. GLB uses portable PBR approximations of toon materials.

There is no configured build/lint pipeline. Check the inline HTML module as well when changing it; manually verify regeneration, snapshots/import/export, and runtime interactions after behavior changes.

| Location | Ownership |
| --- | --- |
| `index.html`, `js/`, `design-system/` | Production runtime shell/modules/theme assets |
| `sandbox/sakana-koi-prototype.html` | Isolated module-coupled experiment; imports existing `js/modules/sakana/` source |

Keep the sandbox with its modules until deliberately extracted; it need not ship with the production page. No hosting config is supplied. Git ignore rules do not define deployment exclusions.

See [AGENTS.md](AGENTS.md) for engineering constraints. Optional full-workspace docs live at `../_docs/README.md`; serving/runtime modules do not depend on that folder and it may be absent in a clone.
