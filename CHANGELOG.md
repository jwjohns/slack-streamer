# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-01-28

### Added
- Initial release
- `SlackStreamer` class for creating streaming sessions
- `Session` class with `edit`, `thread`, and `hybrid` modes
- `SlackTransport` with automatic retry and rate limit handling
- `Scheduler` for throttled message updates
- `RotatingStatus` for animated status messages ("Thinking...", "Pondering...")
- Comprehensive test suite (43 tests)
- Full TypeScript support with exported types
- Documentation with usage examples
