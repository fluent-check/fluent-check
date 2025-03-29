# GitHub Actions and CI/CD Configuration

This document explains the GitHub Actions workflows and CI/CD configuration for the FluentCheck project.

## Overview

FluentCheck uses GitHub Actions for continuous integration and delivery. The CI/CD pipeline automates testing, linting, type checking, dependency management, and publishing. This ensures code quality and simplifies the development process.

The configuration consists of:

- **Main CI workflow**: Runs tests, linting, and type checking
- **Dependabot configuration**: Manages dependencies
- **NPM publishing workflow**: Publishes the package to npm
- **Pull request validation**: Ensures PRs follow standards
- **Automatic PR labeling**: Categorizes PRs based on affected files

## Workflow Files

### 1. Main CI Workflow (`.github/workflows/node.js.yml`)

This workflow runs on push to the main branch, pull requests, and manual triggers.

#### Jobs:

- **Build**: 
  - Runs on multiple Node.js versions (18.x, 20.x)
  - Installs dependencies
  - Runs linting
  - Executes tests
  - Generates and stores coverage reports

- **Type Check**:
  - Verifies TypeScript compilation
  - Catches type errors early

**Triggering**: 
- Pushes to `main`
- Pull requests to `main`
- Manual trigger through GitHub UI

```yaml
name: Node.js CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    # ... steps for testing, linting, etc.
    
  type-check:
    runs-on: ubuntu-latest
    # ... steps for type checking
```

### 2. NPM Publishing (`.github/workflows/npm-publish.yml`)

This workflow automatically publishes the package to npm when a new GitHub release is created.

#### Jobs:

- **Build**:
  - Ensures tests and linting pass before publishing

- **Publish**:
  - Publishes the package to npm with provenance
  - Requires the `NPM_TOKEN` secret to be configured

**Triggering**: 
- Creating a new GitHub release

```yaml
name: Node.js Package

on:
  release:
    types: [created]

jobs:
  build:
    # ... verification steps
    
  publish-npm:
    needs: build
    # ... publishing steps
```

### 3. Pull Request Validation (`.github/workflows/pull-request.yml`)

This workflow validates pull requests by enforcing conventions and adding helpful labels.

#### Jobs:

- **Validate**:
  - Validates PR titles follow semantic conventions
  - Adds labels based on changed files
  - Labels PRs by size based on number of changes

**Triggering**: 
- Opening a PR
- Synchronizing a PR (new commits)
- Reopening a PR
- Adding/removing labels

```yaml
name: Pull Request Validation

on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

jobs:
  validate:
    # ... validation steps
```

## Configuration Files

### 1. Dependabot (`.github/dependabot.yml`)

Dependabot automatically creates pull requests to update dependencies.

#### Key features:

- Weekly checks for npm dependencies
- Monthly checks for GitHub Actions
- Groups related dependencies to reduce PR noise
- Limits open PRs to prevent overwhelming the repository

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # ... additional configuration
    
  - package-ecosystem: "github-actions"
    # ... configuration for GitHub Actions
```

### 2. PR Labeler (`.github/labeler.yml`)

Automatically labels PRs based on which files are changed, helping with categorization and review.

```yaml
area/arbitraries:
  - src/arbitraries/**/*

area/strategies:
  - src/strategies/**/*

# ... other categories
```

## Setup and Configuration

### Required Secrets

To fully utilize these workflows, you need to configure the following secrets:

1. **`NPM_TOKEN`**: For publishing to npm
   - Generate from npm (read/write access)
   - Add as a repository secret in GitHub

### Labels

The PR labeler relies on specific labels existing in your repository. Make sure to create these labels:

- `area/arbitraries`
- `area/strategies`
- `area/core`
- `area/ci`
- `area/docs`
- `area/tests`
- `dependencies`
- Size labels: `size/xs`, `size/s`, `size/m`, `size/l`, `size/xl`

## Release Process

To release a new version:

1. Update version in `package.json`
2. Commit changes
3. Create a tag: `git tag v1.x.x`
4. Push tag: `git push origin v1.x.x`
5. Create a GitHub release from the tag
6. The npm publish workflow will automatically deploy to npm

## Local Testing of Workflows

To test workflows locally before pushing:

1. Install [act](https://github.com/nektos/act)
2. Run: `act -j build` to test the build job

## Maintaining Workflow Files

When updating workflow files:

1. Keep Node.js versions up-to-date with LTS versions
2. Update GitHub Action versions periodically
3. Add new workflow steps as requirements evolve
4. Test workflows after significant changes

## Troubleshooting

Common issues and solutions:

### Workflow Failures

- **Dependency Installation Failures**: Check for incompatible package versions
- **Test Failures**: Check the logs for specific test failures
- **Publishing Failures**: Verify NPM_TOKEN is correct and has publish permissions

### Missing Labels

If PRs aren't being labeled correctly:
- Ensure labels are created in the repository
- Check file patterns in `.github/labeler.yml`

## Best Practices

1. **Never commit secrets** to the repository
2. Use semantic versioning for releases
3. Use semantic PR titles (e.g., "feat: add new arbitrary")
4. Keep workflows focused on specific tasks
5. Use matrix testing for different Node.js versions

## Future Improvements

Potential enhancements for the CI/CD pipeline:

1. Add code quality metrics
2. Implement automated changelog generation
3. Add performance benchmarking
4. Implement automated versioning
5. Add integration with code coverage services 