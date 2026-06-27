import type { DynamicModule } from '@nestjs/common';
import type { Configuard, IAccessorInfo, IConfigItem, IConfiguardOptions } from 'configuard';

// Re-exported for convenience so consumers can type module options without a
// second import from `configuard`.
export type { IAccessorInfo, IConfigItem, IConfiguardOptions };

/**
 * What an async factory may return. All three shapes are normalized into a
 * built `Configuard` instance:
 * - a flat row list (`IConfigItem[]`);
 * - rows plus per-build `accessor` / `options`;
 * - an already-built `Configuard`.
 */
export type ConfiguardFactoryResult =
  | IConfigItem[]
  | { rows: IConfigItem[]; accessor?: IAccessorInfo; options?: IConfiguardOptions }
  | Configuard;

/** Synchronous registration with a static row list. */
export interface ConfiguardModuleOptions {
  /** Flat config rows (typically from a `config` DB table). */
  rows: IConfigItem[];
  /** Accessor info (ABAC). For a backend service set `{ accessor: 'system' }`. */
  accessor?: IAccessorInfo;
  /** configuard build options (`lock`, `decrypt`, `debugLogs`). */
  options?: IConfiguardOptions;
  /** Register the module globally (default `true`). */
  isGlobal?: boolean;
}

/** Asynchronous registration for DB-driven / injected rows. */
export interface ConfiguardModuleAsyncOptions {
  /** Modules to import so their providers are available to `inject`. */
  imports?: DynamicModule['imports'];
  /** Providers to inject into `useFactory` (e.g. `PrismaService`). */
  inject?: any[];
  /** Returns rows (or a built `Configuard`), e.g. loaded from a DB. */
  useFactory: (...args: any[]) => Promise<ConfiguardFactoryResult> | ConfiguardFactoryResult;
  /** Accessor info applied when the factory returns rows. */
  accessor?: IAccessorInfo;
  /** configuard build options applied when the factory returns rows. */
  options?: IConfiguardOptions;
  /** Register the module globally (default `true`). */
  isGlobal?: boolean;
  /** Background auto-reload interval, in ms. `0` / omitted disables it. */
  refreshIntervalMs?: number;
  /** Break-glass: set `false` to disable TTL auto-refresh. Default `true`. */
  refreshEnabled?: boolean;
}

/** The subset of options the service needs at runtime (TTL refresh). */
export interface ResolvedRefreshOptions {
  refreshIntervalMs?: number;
  refreshEnabled?: boolean;
}

/** The rebuild closure provided under {@link CONFIGUARD_BUILDER}. */
export type ConfiguardBuilder = () => Promise<Configuard>;
