# Bonsai Development

Read [README](README.md) for setup, checks, and experimental ownership.

- Preserve deterministic generation, snapshot recall, and the transitional shared/module/app-shell state bridge. Existing Bonsai UI remains authoritative; proposed hub/expansion behavior is not automatically implemented.
- `index.html` owns substantial UI/runtime logic; `js/` contains adapters, manifests, control services, and isolated Sakana modules. Keep existing relative URLs and event paths intact.
- `sandbox/sakana-koi-prototype.html` imports repository modules; retain it here until its dependency and integration gates are deliberately reviewed. It is experimental, not the production entry point.
- Check changed JS with `node --check`; all 18 JS modules currently parse. No package, build, lint, or automated app regression runner is configured. Verify inline module syntax separately; syntax does not verify rendering/snapshot fidelity.
- Follow applicable parent instructions when present. Optional local context is `../_docs/README.md`; static app inputs must not require outer docs. Preserve unrelated worktree changes and report unrun browser/export checks.
