# Contributing

## Commit message style

This package depends on Conventional Commits in order to semantically version each release. The commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

For example:

```
fix: Return correct device list in Firefox
```

```
feat: Switch default codec

BREAKING CHANGE
```

Refer to the [Conventional Commits guide](https://www.conventionalcommits.org/en/v1.0.0/#summary) for the full specification.

## Releasing

Versioning and CHANGELOG updates are automatically handled by the [release-it](https://github.com/release-it/release-it) + [conventional-changelog](https://github.com/conventional-changelog) packages. A preview of the version bump based on your changes can be seen in the [status check of each pull request](https://docs.github.com/en/free-pro-team@latest/github/collaborating-with-issues-and-pull-requests/about-status-checks).

If applicable, a draft GitHub Release is created once a PR is merged into `main`. When ready, publish the GH Release to publish the version to the npm registry.