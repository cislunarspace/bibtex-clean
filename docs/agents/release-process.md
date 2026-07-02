# Release Process

This repository uses a **CI-driven release model**. The GitHub Release and XPI asset are created automatically by GitHub Actions; the local environment should only prepare the version bump and push the tag.

## Trigger

Pushing a tag matching `v**` triggers `.github/workflows/release.yml`, which calls `zotero-plugin-dev/workflows/.github/workflows/release-plugin.yml@main`.

## Local steps

1. Ensure `main` is green: `npm run build && npm run lint:check && npm test`
2. Bump the version in `package.json` and `package-lock.json`
3. Commit the bump, e.g. `chore(release): bump version to X.Y.Z`
4. Push the commit: `git push origin main`
5. Create and push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z`

Do **not** run `npm run release` locally and do **not** create the GitHub Release manually with `gh release create`. The CI workflow will run `npm run release` in an environment where `zotero-plugin-scaffold` treats the run as CI and creates the release.

## CI behavior

- Builds the plugin with `npm run build`
- Creates the GitHub Release for the pushed tag
- Uploads the generated XPI as a release asset
- Generates release notes from conventional commits

## Recovery

If a release workflow fails because the GitHub Release already exists (for example after a manual local release), delete the manually created release and re-run the failed workflow. Keep the tag in place.
