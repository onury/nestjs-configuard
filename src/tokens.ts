import { Inject } from '@nestjs/common';

/** DI token for the *boot* `Configuard` instance (raw / advanced use). */
export const CONFIGUARD = Symbol('CONFIGUARD');

/** DI token for the resolved module refresh options. */
export const CONFIGUARD_OPTIONS = Symbol('CONFIGUARD_OPTIONS');

/**
 * Internal DI token for the rebuild closure (`() => Promise<Configuard>`) that
 * {@link ConfiguardService} uses to reload. Not part of the public API.
 */
export const CONFIGUARD_BUILDER = Symbol('CONFIGUARD_BUILDER');

/**
 * Injects the boot `Configuard` instance:
 *
 *   constructor(@InjectConfiguard() private cfg: Configuard) {}
 *
 * For live config (reload / TTL refresh) inject `ConfiguardService` instead —
 * it always reads the current instance.
 */
export const InjectConfiguard = (): ParameterDecorator => Inject(CONFIGUARD);
