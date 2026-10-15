import { PestanaUnicaService } from './pestana-unica.service';

type Callback = (lock: { name: string } | null) => Promise<void> | undefined;

/** LockManager mínimo con la semántica de Web Locks: exclusivo, en fila y abortable. */
class LocksFalsos {
  private readonly tomados = new Set<string>();
  private readonly fila = new Map<string, (() => void)[]>();

  request(
    nombre: string,
    opciones: { ifAvailable?: boolean; signal?: AbortSignal },
    callback: Callback,
  ): Promise<void> {
    if (opciones.ifAvailable && this.tomados.has(nombre)) {
      return Promise.resolve(callback(null)).then(() => undefined);
    }
    return new Promise<void>((resolve, reject) => {
      const entrar = (): void => {
        this.tomados.add(nombre);
        Promise.resolve(callback({ name: nombre })).then(() => {
          this.tomados.delete(nombre);
          this.fila.get(nombre)?.shift()?.();
          resolve();
        });
      };
      if (!this.tomados.has(nombre)) return entrar();
      const cola = this.fila.get(nombre) ?? [];
      cola.push(entrar);
      this.fila.set(nombre, cola);
      opciones.signal?.addEventListener('abort', () => {
        cola.splice(cola.indexOf(entrar), 1);
        reject(new DOMException('abortado', 'AbortError'));
      });
    });
  }
}

const esperar = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

describe('PestanaUnicaService', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'locks');

  function usarLocks(locks: LocksFalsos | undefined): void {
    Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
  }

  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'locks', original);
    else Reflect.deleteProperty(navigator, 'locks');
  });

  it('sin Web Locks no bloquea', () => {
    usarLocks(undefined);
    const pestana = new PestanaUnicaService();
    pestana.reclamar('acme');
    expect(pestana.estado()).toBe('activa');
  });

  it('la primera pestaña toma la caja y la segunda queda ocupada', async () => {
    usarLocks(new LocksFalsos());
    const primera = new PestanaUnicaService();
    const segunda = new PestanaUnicaService();
    primera.reclamar('acme');
    await esperar();
    segunda.reclamar('acme');
    await esperar();
    expect(primera.estado()).toBe('activa');
    expect(segunda.estado()).toBe('ocupada');
  });

  it('al cerrarse la primera, la segunda toma la caja sola', async () => {
    usarLocks(new LocksFalsos());
    const primera = new PestanaUnicaService();
    const segunda = new PestanaUnicaService();
    primera.reclamar('acme');
    await esperar();
    segunda.reclamar('acme');
    await esperar();
    primera.soltar();
    await esperar();
    expect(segunda.estado()).toBe('activa');
  });

  it('otra empresa no comparte la caja', async () => {
    usarLocks(new LocksFalsos());
    const primera = new PestanaUnicaService();
    const segunda = new PestanaUnicaService();
    primera.reclamar('acme');
    await esperar();
    segunda.reclamar('globex');
    await esperar();
    expect(segunda.estado()).toBe('activa');
  });

  it('cambiar de empresa suelta la caja anterior', async () => {
    usarLocks(new LocksFalsos());
    const primera = new PestanaUnicaService();
    const segunda = new PestanaUnicaService();
    primera.reclamar('acme');
    await esperar();
    segunda.reclamar('acme');
    await esperar();
    primera.reclamar('globex');
    await esperar();
    expect(segunda.estado()).toBe('activa');
    expect(primera.estado()).toBe('activa');
  });

  it('la que deja de esperar no toma la caja después', async () => {
    usarLocks(new LocksFalsos());
    const primera = new PestanaUnicaService();
    const segunda = new PestanaUnicaService();
    const tercera = new PestanaUnicaService();
    primera.reclamar('acme');
    await esperar();
    segunda.reclamar('acme');
    tercera.reclamar('acme');
    await esperar();
    segunda.soltar();
    primera.soltar();
    await esperar();
    expect(tercera.estado()).toBe('activa');
    expect(segunda.estado()).toBe('ocupada');
  });
});
