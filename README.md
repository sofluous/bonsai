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

There is no configured automated app test/build/lint pipeline. Check the inline HTML module as well when changing it; manually verify regeneration, snapshots/import/export, and runtime interactions after behavior changes.

| Location | Ownership |
| --- | --- |
| `index.html`, `js/`, `design-system/` | Production runtime shell/modules/theme assets |
| `sandbox/sakana-koi-prototype.html` | Isolated module-coupled experiment; imports existing `js/modules/sakana/` source |

Keep the sandbox with its modules until deliberately extracted; it need not ship with the production page. No hosting config is supplied. Git ignore rules do not define deployment exclusions.

See [AGENTS.md](AGENTS.md) for engineering constraints. Optional full-workspace docs live at `../_docs/README.md`; serving/runtime modules do not depend on that folder and it may be absent in a clone.
