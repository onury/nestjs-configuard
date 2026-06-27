import { AccessorType, Configuard, type IConfigItem, ListType, ValueType } from 'configuard';
import { ConfiguardService } from './configuard.service';
import type { ConfiguardBuilder, ResolvedRefreshOptions } from './types';

const SYSTEM = { accessor: AccessorType.SYSTEM };

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

const build = (port?: string): Configuard => new Configuard(sampleRows(port), SYSTEM);

function makeService(
  initial: Configuard,
  builder: ConfiguardBuilder = vi.fn(),
  options: ResolvedRefreshOptions = {}
): ConfiguardService {
  return new ConfiguardService(initial, builder, options);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConfiguardService — delegation', () => {
  const svc = makeService(build());

  it('delegates the read API to the current instance', () => {
    expect(svc.get<string>('company.name')).toBe('Acme');
    expect(svc.get<number>('device.port')).toBe(8080);
    expect(svc.get<number>('missing.key', 42)).toBe(42);
    expect(svc.has('company.name')).toBe(true);
    expect(svc.has('missing.key')).toBe(false);
    expect(svc.data).toMatchObject({ company: { name: 'Acme' }, device: { port: 8080 } });
    expect(svc.getMeta('device.port')?.type).toBe(ValueType.INTEGER);
    expect(svc.isEncrypted('device.port')).toBe(true);
    expect(svc.isEncrypted('company.name')).toBe(false);
    expect(svc.requiresReboot('device.port')).toBe(true);
    expect(svc.requiresReboot('company.name')).toBe(false);
    expect(svc.accessor).toBe(AccessorType.SYSTEM);
    expect(svc.appLevel).toBeNull();
    expect(svc.isLocked).toBe(true);
    expect(svc.instance).toBeInstanceOf(Configuard);
  });

  it('exposes the configuard admin-UI helpers as statics', () => {
    expect(ConfiguardService.parseFlat).toBe(Configuard.parseFlat);
    expect(ConfiguardService.serializeFlat).toBe(Configuard.serializeFlat);
  });
});

describe('ConfiguardService — reload', () => {
  it('rebuilds from the builder and swaps the current instance', async () => {
    const next = build('9090');
    const builder = vi.fn<ConfiguardBuilder>().mockResolvedValue(next);
    const svc = makeService(build('8080'), builder);

    expect(svc.get<number>('device.port')).toBe(8080);
    const returned = await svc.reload();

    expect(builder).toHaveBeenCalledTimes(1);
    expect(returned).toBe(next);
    expect(svc.instance).toBe(next);
    expect(svc.get<number>('device.port')).toBe(9090);
  });
});

describe('ConfiguardService — TTL auto-refresh', () => {
  const fakeTimer = { unref: vi.fn() };

  function spyTimers() {
    fakeTimer.unref.mockClear();
    const setSpy = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(fakeTimer as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
    return { setSpy, clearSpy };
  }

  it('starts an unref-ed interval that reloads, and clears it on destroy', () => {
    const { setSpy, clearSpy } = spyTimers();
    const builder = vi.fn<ConfiguardBuilder>().mockResolvedValue(build());
    const svc = makeService(build(), builder, { refreshIntervalMs: 1000, refreshEnabled: true });

    svc.onApplicationBootstrap();
    expect(setSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(fakeTimer.unref).toHaveBeenCalledTimes(1);

    // The interval callback triggers a reload.
    (setSpy.mock.calls[0][0] as () => void)();
    expect(builder).toHaveBeenCalledTimes(1);

    svc.onModuleDestroy();
    expect(clearSpy).toHaveBeenCalledWith(fakeTimer);
  });

  it('treats an absent refreshEnabled as enabled', () => {
    const { setSpy } = spyTimers();
    makeService(build(), vi.fn(), { refreshIntervalMs: 1000 }).onApplicationBootstrap();
    expect(setSpy).toHaveBeenCalledOnce();
  });

  it('does not start a timer when interval is 0 / omitted', () => {
    const { setSpy } = spyTimers();
    makeService(build(), vi.fn(), {}).onApplicationBootstrap();
    makeService(build(), vi.fn(), { refreshIntervalMs: 0 }).onApplicationBootstrap();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('does not start a timer when refreshEnabled is false (break-glass)', () => {
    const { setSpy } = spyTimers();
    makeService(build(), vi.fn(), {
      refreshIntervalMs: 1000,
      refreshEnabled: false
    }).onApplicationBootstrap();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('onModuleDestroy is a no-op when no timer was started', () => {
    const { clearSpy } = spyTimers();
    makeService(build(), vi.fn(), {}).onModuleDestroy();
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
