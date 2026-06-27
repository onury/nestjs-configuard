<h1 align="center">nestjs-configuard</h1>

<p align="center">
  <a href="https://github.com/onury/nestjs-configuard/actions/workflows/ci.yml"><img src="https://github.com/onury/nestjs-configuard/actions/workflows/ci.yml/badge.svg" alt="build" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-2BB150?logo=vitest&logoColor=%23FDC72B&style=flat" alt="coverage" />
  <img src="https://img.shields.io/badge/mutation-100%25-2BB150?style=flat" alt="mutation score" />
  <img src="https://img.shields.io/badge/ESM-F7DF1E?style=flat" alt="ESM" />
  <img src="https://img.shields.io/badge/TS-3260C7?style=flat" alt="TS" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="license" />
</p>

> This module is **ESM** 🔆.

NestJS integration for [**configuard**](https://onury.io/configuard) — wires a
DB-backed, **typed**, **ABAC-filtered** runtime configuration object into Nest's
DI, with **live reload** and optional **TTL auto-refresh**.

Where `@nestjs/config` handles `.env` (secrets, bootstrap), `configuard` handles
the long, ever-growing list of **non-secret, admin-editable runtime tunables**
stored as flat rows in a `config` table. This package makes consuming and
refreshing those values idiomatic in NestJS.

## Install

```bash
npm install nestjs-configuard configuard
```

`@nestjs/common`, `@nestjs/core`, `reflect-metadata`, and `configuard` are peer
dependencies.

## Register the module

### Static rows — `forRoot`

```ts
import { Module } from '@nestjs/common';
import { ConfiguardModule, AccessorType } from 'nestjs-configuard';
import { rows } from './config.rows';

@Module({
  imports: [
    ConfiguardModule.forRoot({
      rows,
      accessor: { accessor: AccessorType.SYSTEM },
    }),
  ],
})
export class AppModule {}
```

### DB-driven rows — `forRootAsync`

The factory can inject anything (e.g. a Prisma service) and load rows from a
`config` table. Add `refreshIntervalMs` to reload them in the background.

```ts
import { Module } from '@nestjs/common';
import { ConfiguardModule, AccessorType } from 'nestjs-configuard';
import { PrismaModule, PrismaService } from './prisma';

@Module({
  imports: [
    ConfiguardModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: async (prisma: PrismaService) => prisma.config.findMany(),
      accessor: { accessor: AccessorType.SYSTEM },
      refreshIntervalMs: 60_000, // background reload; omit to disable
      // refreshEnabled: false,  // break-glass: disable the timer entirely
    }),
  ],
})
export class AppModule {}
```

The factory may return a flat `IConfigItem[]`, an object
`{ rows, accessor?, options? }`, or an already-built `Configuard`.

## Consume

### `ConfiguardService` (recommended — always current)

Reads through the service, so values stay fresh across a reload:

```ts
import { Injectable } from '@nestjs/common';
import { ConfiguardService } from 'nestjs-configuard';

@Injectable()
export class PortService {
  constructor(private readonly cfg: ConfiguardService) {}

  get port(): number {
    return this.cfg.get<number>('device.port', 8080)!;
  }

  // Re-run the factory after an admin saves new values:
  async refresh() {
    await this.cfg.reload();
  }
}
```

`ConfiguardService` delegates the full read API — `get`, `has`, `data`,
`getMeta`, `isEncrypted`, `requiresReboot`, `accessor`, `appLevel`, `isLocked`,
`instance` — plus `reload()`. Static `ConfiguardService.parseFlat` /
`serializeFlat` mirror configuard's admin-UI helpers.

### Raw instance — `@InjectConfiguard()`

For advanced use where you want the boot instance directly (no live reload):

```ts
import { Injectable } from '@nestjs/common';
import { Configuard, InjectConfiguard } from 'nestjs-configuard';

@Injectable()
export class Service {
  constructor(@InjectConfiguard() private readonly cfg: Configuard) {}
}
```

## TTL auto-refresh

When `refreshIntervalMs > 0`, the service starts an `unref`'d timer on
application bootstrap that reloads config every interval (the DB-config
"~60s cache"), and clears it on module destroy. Set `refreshEnabled: false` to
keep it off (break-glass) without removing the interval config.

## License

MIT © Onur Yıldırım
