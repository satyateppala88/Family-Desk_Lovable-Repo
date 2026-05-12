## Plan: Add `.env` entries to `.gitignore`

Append three lines to the existing `.gitignore` so environment files stop being tracked. `*.local` is already covered (line 13), which handles `.env.local` and `.env*.local` via the existing wildcard, but I'll still add the explicit lines per your instructions for clarity.

### Change

Append to `.gitignore`:

```
.env
.env.local
.env*.local
```

### Notes
- No other lines in `.gitignore` will be touched.
- `.env` will not be modified.
- Untracking the already-committed `.env` from git history requires a `git rm --cached .env` operation, which I cannot run (git state is managed by the platform). After this `.gitignore` update, you'll want to remove `.env` from tracking via your normal git workflow so it's no longer committed going forward.
