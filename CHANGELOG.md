# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-06-28

### Added

- Initial release.
- `ConfiguardModule.forRoot` / `forRootAsync` to register a `configuard`
  instance in Nest's DI (global by default).
- `ConfiguardService` — live consumption surface delegating configuard's read
  API, with `reload()` and optional TTL auto-refresh (`refreshIntervalMs`,
  break-glass `refreshEnabled`).
- `CONFIGUARD` token and `@InjectConfiguard()` for the raw boot instance.
- One-import re-exports of configuard essentials (`Configuard`, `AccessorType`,
  `ListType`, `ValueType`, `ConfiguardError`, and core types).
