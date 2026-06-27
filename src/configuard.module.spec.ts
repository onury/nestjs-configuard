import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccessorType, Configuard, type IConfigItem, ListType, ValueType } from 'configuard';
import { ConfiguardModule } from './configuard.module';
import { ConfiguardService } from './configuard.service';
import { CONFIGUARD, CONFIGUARD_OPTIONS } from './tokens';

const sampleRows = (port = '8080'): IConfigItem[] => [
  {
    accessor: AccessorType.SYSTEM,
    key: 'company.name',
    type: ValueType.STRING,
    listType: ListType.NONE,
    value: 'Acme',
    editable: true,
    requiresReboot: false,
    encrypt: false
  },
  {
    accessor: AccessorType.SYSTEM,
    key: 'device.port',
    type: ValueType.INTEGER,
    listType: ListType.NONE,
    value: port,
    editable: false,
    requiresReboot: true,
    encrypt: true
  }
];

const SYSTEM = { accessor: AccessorType.SYSTEM };

async function build(metadata: Parameters<typeof Test.createTestingModule>[0]) {
  return Test.createTestingModule(metadata).compile();
}

describe('ConfiguardModule.forRoot', () => {
  it('builds, registers, and resolves the instance + service', async () => {
    const moduleRef = await build({
      imports: [ConfiguardModule.forRoot({ rows: sampleRows(), accessor: SYSTEM })]
    });

    const raw = moduleRef.get<Configuard>(CONFIGUARD);
    const svc = moduleRef.get(ConfiguardService);

    expect(raw).toBeInstanceOf(Configuard);
    expect(raw.get<number>('device.port')).toBe(8080);
    expect(svc.get<string>('company.name')).toBe('Acme');
  });

  it('registers globally by default and honors isGlobal: false', () => {
    expect(ConfiguardModule.forRoot({ rows: [], accessor: SYSTEM }).global).toBe(true);
    expect(ConfiguardModule.forRoot({ rows: [], accessor: SYSTEM, isGlobal: false }).global).toBe(
      false
    );
  });

  it('throws when rows is missing or not an array', () => {
    expect(() => ConfiguardModule.forRoot(undefined as never)).toThrow(/`rows`/);
    expect(() => ConfiguardModule.forRoot({ rows: 'nope' } as never)).toThrow(/`rows`/);
  });
});

describe('ConfiguardModule.forRootAsync', () => {
  it('builds from a flat row list returned by the factory', async () => {
    const moduleRef = await build({
      imports: [
        ConfiguardModule.forRootAsync({
          useFactory: () => sampleRows('1234'),
          accessor: SYSTEM
        })
      ]
    });
    expect(moduleRef.get(ConfiguardService).get<number>('device.port')).toBe(1234);
  });

  it('builds from a { rows, accessor } object, the object accessor winning', async () => {
    const moduleRef = await build({
      imports: [
        ConfiguardModule.forRootAsync({
          // Module-level accessor is intentionally absent; the object supplies it.
          useFactory: () => ({ rows: sampleRows(), accessor: SYSTEM })
        })
      ]
    });
    expect(moduleRef.get(ConfiguardService).accessor).toBe(AccessorType.SYSTEM);
  });

  it('builds from { rows, options }, the object options winning over module options', async () => {
    const moduleRef = await build({
      imports: [
        ConfiguardModule.forRootAsync({
          useFactory: () => ({ rows: sampleRows(), accessor: SYSTEM, options: { lock: false } }),
          options: { lock: true }
        })
      ]
    });
    expect(moduleRef.get(ConfiguardService).isLocked).toBe(false);
  });

  it('falls back to module-level accessor/options when the object omits them', async () => {
    const moduleRef = await build({
      imports: [
        ConfiguardModule.forRootAsync({
          useFactory: () => ({ rows: sampleRows('7777') }),
          accessor: SYSTEM,
          options: { lock: false }
        })
      ]
    });
    const svc = moduleRef.get(ConfiguardService);
    expect(svc.accessor).toBe(AccessorType.SYSTEM);
    expect(svc.isLocked).toBe(false);
    expect(svc.get<number>('device.port')).toBe(7777);
  });

  it('passes an already-built Configuard through untouched', async () => {
    const built = new Configuard(sampleRows('4321'), SYSTEM);
    const moduleRef = await build({
      imports: [ConfiguardModule.forRootAsync({ useFactory: () => built })]
    });
    expect(moduleRef.get<Configuard>(CONFIGUARD)).toBe(built);
  });

  it('resolves and injects factory dependencies from an imported module', async () => {
    const ROWS = Symbol('ROWS');
    @Module({ providers: [{ provide: ROWS, useValue: sampleRows('5555') }], exports: [ROWS] })
    class RowsModule {}

    const moduleRef = await build({
      imports: [
        ConfiguardModule.forRootAsync({
          imports: [RowsModule],
          inject: [ROWS],
          useFactory: (rows: IConfigItem[]) => rows,
          accessor: SYSTEM
        })
      ]
    });
    expect(moduleRef.get(ConfiguardService).get<number>('device.port')).toBe(5555);
  });

  it('honors isGlobal: false', () => {
    const dyn = ConfiguardModule.forRootAsync({
      useFactory: () => [],
      accessor: SYSTEM,
      isGlobal: false
    });
    expect(dyn.global).toBe(false);
  });

  it('throws when useFactory is missing', () => {
    expect(() => ConfiguardModule.forRootAsync(undefined as never)).toThrow(/useFactory/);
    expect(() => ConfiguardModule.forRootAsync({} as never)).toThrow(/useFactory/);
  });
});

describe('ConfiguardModule — DynamicModule shape', () => {
  it('forRoot exports the instance token and the service', () => {
    const dyn = ConfiguardModule.forRoot({ rows: [], accessor: SYSTEM });
    expect(dyn.exports).toEqual([CONFIGUARD, ConfiguardService]);
  });

  it('forRootAsync defaults to global, empty imports, and exports the token + service', () => {
    const dyn = ConfiguardModule.forRootAsync({ useFactory: () => [], accessor: SYSTEM });
    expect(dyn.global).toBe(true);
    expect(dyn.imports).toEqual([]);
    expect(dyn.exports).toEqual([CONFIGUARD, ConfiguardService]);
  });

  it('forRootAsync threads refresh options into the options provider', () => {
    const dyn = ConfiguardModule.forRootAsync({
      useFactory: () => [],
      accessor: SYSTEM,
      refreshIntervalMs: 1234,
      refreshEnabled: false
    });
    const provider = (dyn.providers ?? []).find(
      (p): p is { provide: symbol; useValue: unknown } =>
        typeof p === 'object' && 'provide' in p && p.provide === CONFIGUARD_OPTIONS
    );
    expect(provider?.useValue).toEqual({ refreshIntervalMs: 1234, refreshEnabled: false });
  });
});
