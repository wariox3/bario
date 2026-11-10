import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { Popover } from 'primeng/popover';
import { I18nService } from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import { MesSelectorComponent } from './mes-selector.component';

describe('MesSelectorComponent', () => {
  let fixture: ComponentFixture<MesSelectorComponent>;
  let component: MesSelectorComponent;
  const panel = { hide: jest.fn(), toggle: jest.fn() } as unknown as Popover;

  beforeEach(() => {
    jest.clearAllMocks();
    // Hoy fijo en agosto: tercer trimestre, con septiembre todavía por llegar.
    jest.useFakeTimers({ now: new Date(2026, 7, 15, 10, 30), doNotFake: ['queueMicrotask'] });
    TestBed.configureTestingModule({
      imports: [MesSelectorComponent],
      providers: [
        { provide: I18nService, useValue: { t: signal(dictionaries.es), lang: signal('es') } },
      ],
    });
    fixture = TestBed.createComponent(MesSelectorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mes', new Date(2026, 7, 15));
    fixture.detectChanges();
  });

  afterEach(() => jest.useRealTimers());

  const fila = (trimestre: number) => component['filas']()[trimestre];

  it('rotula el mes o el trimestre según el modo', () => {
    expect(component['rotulo']()).toBe('agosto de 2026');
    fixture.componentRef.setInput('modo', 'trimestre');
    expect(component['rotulo']()).toBe('trimestre 3 de 2026');
  });

  it('no deja elegir un mes que aún no llega, pero sí el trimestre en curso', () => {
    const tercero = fila(2);
    expect(tercero?.meses.map((m) => m.futura)).toEqual([false, false, true]);
    expect(tercero?.futura).toBe(false);
    expect(fila(3)?.futura).toBe(true);
  });

  it('elegir un mes de otro año lo fija y cierra el panel', () => {
    component['moverAnio'](-1);
    component['elegirMes'](2, panel);

    const elegido = component.mes();
    expect([elegido.getFullYear(), elegido.getMonth()]).toEqual([2025, 2]);
    expect(panel.hide).toHaveBeenCalled();
  });

  it('elegir un trimestre arranca en su primer mes', () => {
    component['elegirTrimestre'](1, panel);

    expect(component.mes().getMonth()).toBe(3);
  });

  it('tocar el trimestre ya elegido no cambia el mes de referencia', () => {
    const antes = component.mes();
    component['elegirTrimestre'](2, panel);

    expect(component.mes()).toBe(antes);
    expect(panel.hide).toHaveBeenCalled();
  });

  it('no avanza más allá del año en curso', () => {
    component['moverAnio'](1);

    expect(component['anioVisible']()).toBe(2026);
  });

  it('al abrir vuelve al año de lo elegido', () => {
    component['moverAnio'](-1);
    component['abrir'](panel, new Event('click'));

    expect(component['anioVisible']()).toBe(2026);
    expect(panel.toggle).toHaveBeenCalled();
  });
});
