import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ErpSelectDataService, type ErpSelectOption } from '@reddoc/core';
import { ErpApiSelectComponent } from './erp-api-select.component';

const GENERAL: ErpSelectOption = { id: 1, nombre: 'General' };
const BODEGA: ErpSelectOption = { id: 2, nombre: 'Bodega' };

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ErpApiSelectComponent],
  template: `
    <lib-api-select
      [formControl]="control"
      [endpoint]="endpoint()"
      [catalogo]="catalogo()"
      [suggestedIndex]="sugerido()"
      (optionsLoaded)="cargas = cargas + 1"
    />
  `,
})
class HostComponent {
  readonly control = new FormControl<ErpSelectOption | null>(null);
  readonly endpoint = signal('');
  readonly catalogo = signal<readonly ErpSelectOption[] | null>(null);
  readonly sugerido = signal<number | null>(null);
  cargas = 0;
}

describe('ErpApiSelectComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let fetchAllOptions: jest.Mock;

  const select = (): ErpApiSelectComponent =>
    fixture.debugElement.query(By.directive(ErpApiSelectComponent)).componentInstance;

  beforeEach(() => {
    fetchAllOptions = jest.fn(() => of([GENERAL, BODEGA]));
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: ErpSelectDataService, useValue: { fetchAllOptions } }],
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('con endpoint trae su catálogo', () => {
    host.endpoint.set('/inventario/almacen/seleccionar/');
    fixture.detectChanges();

    expect(fetchAllOptions).toHaveBeenCalledTimes(1);
    expect(select().options()).toEqual([GENERAL, BODEGA]);
  });

  it('con catálogo del padre no consulta, aunque también tenga endpoint', () => {
    host.endpoint.set('/inventario/almacen/seleccionar/');
    host.catalogo.set([GENERAL, BODEGA]);
    fixture.detectChanges();

    expect(fetchAllOptions).not.toHaveBeenCalled();
    expect(select().options()).toEqual([GENERAL, BODEGA]);
    expect(select().loading()).toBe(false);
  });

  it('pinta el valor cargado mientras el catálogo del padre llega vacío', () => {
    const cargado: ErpSelectOption = { id: 7, nombre: 'Sur' };
    host.control.setValue(cargado);
    host.catalogo.set([]);
    fixture.detectChanges();

    expect(select().options()).toEqual([cargado]);

    host.catalogo.set([GENERAL, { id: 7, nombre: 'Sur' }]);
    fixture.detectChanges();

    // Ya está en el catálogo: no se duplica.
    expect(
      select()
        .options()
        .map((o) => o.id),
    ).toEqual([1, 7]);
  });

  it('sugiere y emite una vez por catálogo, no en cada selección', () => {
    host.sugerido.set(0);
    host.catalogo.set([]);
    fixture.detectChanges();

    // Con el vacío de mientras carga no sugiere ni emite.
    expect(host.control.value).toBeNull();
    expect(host.cargas).toBe(0);

    host.catalogo.set([GENERAL, BODEGA]);
    fixture.detectChanges();
    expect(host.control.value).toEqual(GENERAL);
    expect(host.cargas).toBe(1);

    select().onValueChange(BODEGA);
    fixture.detectChanges();
    expect(host.control.value).toEqual(BODEGA);
    expect(host.cargas).toBe(1);
  });
});
