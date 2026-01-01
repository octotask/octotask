# Branching Strategy

## Overview

OctoTask follows a **Git Flow-inspired** branching strategy to maintain code quality and ensure stable releases while enabling rapid development.

## Branch Structure

```
stable (production)
  ↑
  └── release/* (release preparation)
        ↑
        └── main (development)
              ↑
              ├── feature/* (new features)
              ├── bugfix/* (bug fixes)
              └── docs/* (documentation)

hotfix/* (critical fixes)
  ↓
stable
```

## Branch Descriptions

### `stable`
- **Purpose**: Production-ready code
- **Protection**: Highest level of protection
- **Merges From**: `release/*` and `hotfix/*` branches only
- **Deployments**: Production environment
- **Tags**: All release versions (e.g., `v1.0.0`, `v1.1.0`)

### `main`
- **Purpose**: Active development and integration
- **Protection**: Moderate protection
- **Merges From**: `feature/*`, `bugfix/*`, `docs/*` branches
- **Deployments**: Staging/development environment
- **Tags**: Pre-release versions (e.g., `v1.1.0-beta.1`)

### Feature Branches (`feature/*`)
- **Purpose**: New features and enhancements
- **Naming**: `feature/short-description` (e.g., `feature/add-dark-mode`)
- **Branch From**: `main`
- **Merge To**: `main`
- **Lifetime**: Deleted after merge

### Bugfix Branches (`bugfix/*`)
- **Purpose**: Non-critical bug fixes
- **Naming**: `bugfix/issue-number-description` (e.g., `bugfix/123-fix-login`)
- **Branch From**: `main`
- **Merge To**: `main`
- **Lifetime**: Deleted after merge

### Release Branches (`release/*`)
- **Purpose**: Release preparation and final testing
- **Naming**: `release/v1.x.x` (e.g., `release/v1.2.0`)
- **Branch From**: `main`
- **Merge To**: `stable` and back to `main`
- **Lifetime**: Deleted after merge

### Hotfix Branches (`hotfix/*`)
- **Purpose**: Critical production fixes
- **Naming**: `hotfix/v1.x.x` (e.g., `hotfix/v1.1.1`)
- **Branch From**: `stable`
- **Merge To**: `stable` and `main`
- **Lifetime**: Deleted after merge

### Documentation Branches (`docs/*`)
- **Purpose**: Documentation updates only
- **Naming**: `docs/description` (e.g., `docs/update-readme`)
- **Branch From**: `main`
- **Merge To**: `main`
- **Lifetime**: Deleted after merge

## Workflows

### Adding a New Feature

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/my-awesome-feature

# 2. Develop and commit
git add .
git commit -m "feat: add awesome feature"

# 3. Push and create PR
git push -u origin feature/my-awesome-feature
# Create PR to main on GitHub

# 4. After merge, delete branch
git checkout main
git pull origin main
git branch -d feature/my-awesome-feature
```

### Fixing a Bug

```bash
# 1. Create bugfix branch from main
git checkout main
git pull origin main
git checkout -b bugfix/123-fix-issue

# 2. Fix and commit
git add .
git commit -m "fix: resolve issue #123"

# 3. Push and create PR
git push -u origin bugfix/123-fix-issue
# Create PR to main on GitHub
```

### Creating a Release

```bash
# 1. Create release branch from main
git checkout main
git pull origin main
git checkout -b release/v1.2.0

# 2. Update version and changelog
npm version 1.2.0 --no-git-tag-version
# Update CHANGES.md

# 3. Commit version bump
git add .
git commit -m "chore: bump version to 1.2.0"

# 4. Push and create PR to stable
git push -u origin release/v1.2.0
# Create PR to stable on GitHub

# 5. After merge to stable, merge back to main
# This is typically done via PR or automated workflow
```

### Hotfix for Production

```bash
# 1. Create hotfix branch from stable
git checkout stable
git pull origin stable
git checkout -b hotfix/v1.1.1

# 2. Fix critical issue
git add .
git commit -m "fix: critical security patch"

# 3. Update version
npm version patch --no-git-tag-version

# 4. Push and create PRs
git push -u origin hotfix/v1.1.1
# Create PR to stable on GitHub
# Create separate PR to main on GitHub
```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples
```
feat(auth): add OAuth2 authentication
fix(ui): resolve button alignment issue
docs(readme): update installation instructions
chore(deps): upgrade dependencies
```

## Pull Request Guidelines

### Before Creating a PR

1. ✅ Ensure all tests pass locally
2. ✅ Run linting: `pnpm lint`
3. ✅ Update documentation if needed
4. ✅ Rebase on target branch if needed
5. ✅ Write clear commit messages

### PR Title Format

Follow the same convention as commit messages:
```
feat: add new feature
fix: resolve bug
docs: update documentation
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Branch Protection Rules

### `stable` Branch
- ✅ Require pull request reviews (2 approvals minimum)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Require signed commits
- ✅ Include administrators
- ✅ Restrict push access to maintainers

### `main` Branch
- ✅ Require pull request reviews (1 approval minimum)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Allow force push for maintainers

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes (e.g., `1.0.0` → `2.0.0`)
- **MINOR**: New features, backward compatible (e.g., `1.0.0` → `1.1.0`)
- **PATCH**: Bug fixes, backward compatible (e.g., `1.0.0` → `1.0.1`)

### Release Checklist

1. Create `release/vX.Y.Z` branch from `main`
2. Update version in `package.json`
3. Update `CHANGES.md` with release notes
4. Run full test suite
5. Create PR to `stable`
6. After approval and merge, tag is automatically created
7. Merge back to `main`
8. GitHub Actions builds and publishes release assets

## FAQ

**Q: Can I commit directly to `main`?**  
A: No, all changes must go through pull requests.

**Q: How do I sync my fork?**  
A: Add upstream remote and pull regularly:
```bash
git remote add upstream https://github.com/octotask/octotask.git
git fetch upstream
git checkout main
git merge upstream/main
```

**Q: What if my PR conflicts with main?**  
A: Rebase your branch on the latest main:
```bash
git checkout main
git pull origin main
git checkout your-branch
git rebase main
# Resolve conflicts
git push --force-with-lease
```

**Q: How long should branches live?**  
A: Feature/bugfix branches should be short-lived (days to weeks). Delete after merge.

## Resources

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
