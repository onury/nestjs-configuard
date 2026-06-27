import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { Configuard, type IAccessorInfo, type IConfiguardOptions } from 'configuard';
import { ConfiguardService } from './configuard.service';
import { CONFIGUARD, CONFIGUARD_BUILDER, CONFIGUARD_OPTIONS } from './tokens';
import type {
  ConfiguardBuilder,
  ConfiguardFactoryResult,
  ConfiguardModuleAsyncOptions,
  ConfiguardModuleOptions,
  ResolvedRefreshOptions
} from './types';

/** Normalizes any factory result into a built `Configuard` instance. */
function buildFrom(
  result: ConfiguardFactoryResult,
  accessor?: IAccessorInfo,
  options?: IConfiguardOptions
): Configuard {
  if (result instanceof Configuard) return result;
  if (Array.isArray(result)) return new Configuard(result, accessor, options);
  return new Configuard(result.rows, result.accessor ?? accessor, result.options ?? options);
}

/** Resolves the `CONFIGUARD` token from the builder (Nest awaits the promise). */
const instanceProvider: Provider = {
  provide: CONFIGUARD,
  useFactory: (builder: ConfiguardBuilder) => builder(),
  inject: [CONFIGUARD_BUILDER]
};

@Module({})
export class ConfiguardModule {
  /** Synchronous registration with a static row list. */
  static forRoot(options: ConfiguardModuleOptions): DynamicModule {
    if (!options || !Array.isArray(options.rows)) {
      throw new Error('ConfiguardModule.forRoot: `rows` (an array of config items) is required.');
    }

    const { rows, accessor, options: buildOptions } = options;
    const builder: ConfiguardBuilder = () =>
      Promise.resolve(new Configuard(rows, accessor, buildOptions));

    const providers: Provider[] = [
      { provide: CONFIGUARD_OPTIONS, useValue: {} satisfies ResolvedRefreshOptions },
      { provide: CONFIGUARD_BUILDER, useValue: builder },
      instanceProvider,
      ConfiguardService
    ];

    return {
      module: ConfiguardModule,
      global: options.isGlobal ?? true,
      providers,
      exports: [CONFIGUARD, ConfiguardService]
    };
  }

  /** Asynchronous registration for DB-driven / injected rows. */
  static forRootAsync(asyncOptions: ConfiguardModuleAsyncOptions): DynamicModule {
    if (!asyncOptions || typeof asyncOptions.useFactory !== 'function') {
      throw new Error('ConfiguardModule.forRootAsync: a `useFactory` function is required.');
    }

    const refreshOptions: ResolvedRefreshOptions = {
      refreshIntervalMs: asyncOptions.refreshIntervalMs,
      refreshEnabled: asyncOptions.refreshEnabled
    };

    const providers: Provider[] = [
      { provide: CONFIGUARD_OPTIONS, useValue: refreshOptions },
      {
        provide: CONFIGUARD_BUILDER,
        // Capture the resolved deps once; each call re-runs the user factory so
        // `reload()` picks up fresh rows from the source (e.g. the DB).
        useFactory:
          (...deps: any[]): ConfiguardBuilder =>
          () =>
            Promise.resolve(asyncOptions.useFactory(...deps)).then((result) =>
              buildFrom(result, asyncOptions.accessor, asyncOptions.options)
            ),
        inject: asyncOptions.inject ?? []
      },
      instanceProvider,
      ConfiguardService
    ];

    return {
      module: ConfiguardModule,
      global: asyncOptions.isGlobal ?? true,
      imports: asyncOptions.imports ?? [],
      providers,
      exports: [CONFIGUARD, ConfiguardService]
    };
  }
}
