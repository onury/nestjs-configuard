import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy
} from '@nestjs/common';
import { Configuard, type IConfigItem } from 'configuard';
import { CONFIGUARD, CONFIGUARD_BUILDER, CONFIGUARD_OPTIONS } from './tokens';
import type { ConfiguardBuilder, ResolvedRefreshOptions } from './types';

/**
 * The primary, live consumption surface. Holds the current (frozen)
 * `Configuard` instance and delegates its read API, so callers always read
 * fresh values across a {@link ConfiguardService.reload}:
 *
 *   constructor(private cfg: ConfiguardService) {}
 *   this.cfg.get<number>('device.port');
 *
 * When registered via `forRootAsync` with `refreshIntervalMs`, it also reloads
 * on a background timer (the DB-config "~60s cache"); set `refreshEnabled:
 * false` to disable that (break-glass).
 */
@Injectable()
export class ConfiguardService implements OnApplicationBootstrap, OnModuleDestroy {
  /** Admin-UI helper: resolve a flat list (templates, option lists). */
  static readonly parseFlat = Configuard.parseFlat;
  /** Admin-UI helper: serialize edits back into DB-ready rows. */
  static readonly serializeFlat = Configuard.serializeFlat;

  private current: Configuard;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(CONFIGUARD) initial: Configuard,
    @Inject(CONFIGUARD_BUILDER) private readonly builder: ConfiguardBuilder,
    @Inject(CONFIGUARD_OPTIONS) private readonly options: ResolvedRefreshOptions
  ) {
    this.current = initial;
  }

  /** The current underlying `Configuard` instance. */
  get instance(): Configuard {
    return this.current;
  }

  /** The built, nested configuration object. */
  get data(): Record<string, unknown> {
    return this.current.data;
  }

  /** Whether the built object is locked (deep-frozen). */
  get isLocked(): boolean {
    return this.current.isLocked;
  }

  /** The accessor this instance was built for. */
  get accessor(): Configuard['accessor'] {
    return this.current.accessor;
  }

  /** The application access level, when the accessor is `application`. */
  get appLevel(): Configuard['appLevel'] {
    return this.current.appLevel;
  }

  /** Gets a typed value by its dot/bracket-notation path. */
  get<T = unknown>(path: string, defaultValue?: T): T | undefined {
    return this.current.get<T>(path, defaultValue);
  }

  /** Whether a value exists at the given path. */
  has(path: string): boolean {
    return this.current.has(path);
  }

  /** A read-only view of the source item's metadata for a key. */
  getMeta(key: string): Readonly<IConfigItem> | undefined {
    return this.current.getMeta(key);
  }

  /** Whether the item at the key is marked `encrypt: true`. */
  isEncrypted(key: string): boolean {
    return this.current.isEncrypted(key);
  }

  /** Whether changing the item at the key requires a reboot. */
  requiresReboot(key: string): boolean {
    return this.current.requiresReboot(key);
  }

  /** Re-runs the builder and swaps in the freshly built instance. */
  async reload(): Promise<Configuard> {
    this.current = await this.builder();
    return this.current;
  }

  onApplicationBootstrap(): void {
    const ms = this.options.refreshIntervalMs ?? 0;
    if (ms > 0 && this.options.refreshEnabled !== false) {
      this.timer = setInterval(() => {
        void this.reload();
      }, ms);
      // Don't keep the event loop alive just for config refresh.
      this.timer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
