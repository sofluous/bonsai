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

State regressions: `node --test tests/ui-state.test.cjs tests/save-state.test.cjs tests/export-state.test.cjs tests/storage-state.test.cjs`. Optional browser acceptance: `node tests/ui.browser.cjs` with `playwright-core` and installed Edge; set `BONSAI_PLAYWRIGHT` to an external driver module path and optionally `BONSAI_SCREENSHOT` to a PNG output path. The browser check starts/stops its own local server and requires access to the existing CDNs.

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

Storage/gallery acceptance: `node tests/storage.browser.cjs` uses the same external Edge/driver setup. Covers stale-database recovery after fallback writes/deletions, total write failure/retry, 500-record batched galleries and keyboard focus/action behavior. Optional `BONSAI_STORAGE_REPORT` writes JSON evidence.

Save compatibility: current records/state carry `schemaVersion: 2`, with `state.namespaced` authoritative and legacy fields generated for compatibility. Unversioned/schema-1 records migrate using their historical legacy-first precedence. Missing/malformed version-2 authority is rejected; unsupported stored records remain preserved in writes/exports. Gallery exports retain wrapper version 1. Schema-1-only older builds preserve version-2 records but cannot open them; older readers that ignore versions can use legacy mirrors. No automatic pruning or compatibility-field removal is performed.

Touch/pen acceptance: `node tests/input.browser.cjs` uses the existing external Edge/playwright-core setup. Covers native emulated touch at four portrait/landscape sizes and CDP pen hover/contact after mouse use. Optional `BONSAI_INPUT_REPORT` writes JSON. This is not physical-device or other-engine certification.

Gallery UX acceptance: `node tests/gallery.browser.cjs` checks selection/focus, Open/rename/delete, native double-click/context menu, keyboard/dismissal/bounds, persistence, safe text and action previews. Uses the existing external Edge/playwright-core setup. Optional `BONSAI_GALLERY_OUTPUT` writes screenshots/results into an existing directory. Bonsai intentionally uses owner-approved Raden-style action previews for utility glyphs; actual state remains in aria-pressed.

Control-layout acceptance: `node tests/layout.browser.cjs` checks lock-slot ownership, paired locks, Export action columns and dropdown insets/native keyboard behavior across tabs, four viewports, three themes and forced colors. Uses the existing external Edge/playwright-core setup. Optional `BONSAI_LAYOUT_OUTPUT` writes evidence to an existing directory.

HUD acceptance: `node tests/hud.browser.cjs` verifies camera/toolbar clearance, Save/Random scroll reachability, shallow panel sizing, visibility/theme/desktop transitions and native emulated touch Save/zoom/swipe/Random. Uses the existing Edge/playwright-core setup. Optional `BONSAI_HUD_OUTPUT` writes evidence into an existing directory; test probes are server-injected only.

Accessibility acceptance: `node tests/accessibility.browser.cjs` uses the existing Edge/playwright-core setup and CDP accessibility tree. Checks names across all tabs, label behavior, reciprocal tab/panel semantics, native keyboard focus/selection and stored sub-tab reload. Optional `BONSAI_A11Y_OUTPUT` writes results into an existing directory. Manual screen-reader/device acceptance remains separate.
