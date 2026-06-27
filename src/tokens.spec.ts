import { CONFIGUARD, CONFIGUARD_BUILDER, CONFIGUARD_OPTIONS, InjectConfiguard } from './tokens';

describe('tokens', () => {
  it('exposes three distinct symbol tokens', () => {
    expect(typeof CONFIGUARD).toBe('symbol');
    expect(typeof CONFIGUARD_OPTIONS).toBe('symbol');
    expect(typeof CONFIGUARD_BUILDER).toBe('symbol');
    expect(new Set([CONFIGUARD, CONFIGUARD_OPTIONS, CONFIGUARD_BUILDER]).size).toBe(3);
  });

  it('InjectConfiguard() injects the CONFIGUARD token', () => {
    class Probe {
      constructor(@InjectConfiguard() readonly cfg: unknown) {}
    }
    // NestJS stores parameter injections under this metadata key.
    const deps = Reflect.getMetadata('self:paramtypes', Probe) as Array<{
      index: number;
      param: unknown;
    }>;
    expect(deps).toEqual([{ index: 0, param: CONFIGUARD }]);
  });
});
