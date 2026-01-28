# Contributing to slack-streamer

Thanks for your interest in contributing! This document outlines how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/jwjohns/slack-streamer.git
cd slack-streamer

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## Code Style

- TypeScript with strict mode
- Prettier for formatting
- ESLint for linting

Run `npm run lint` and `npm run format` before committing.

## Testing

All changes should include tests. Run the full suite with:

```bash
npm test
```

For coverage:

```bash
npm run test:coverage
```

## Pull Requests

1. Fork the repo and create your branch from `main`
2. Add tests for any new functionality
3. Ensure all tests pass
4. Update documentation if needed
5. Submit your PR

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Issues

Found a bug or have a feature request? [Open an issue](https://github.com/jwjohns/slack-streamer/issues).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
