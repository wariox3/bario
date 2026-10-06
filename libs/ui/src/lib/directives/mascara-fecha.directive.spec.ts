import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import {
  aplicarMascara,
  editarEnMedio,
  enmascararPegado,
  MascaraFechaDirective,
  saltarSeparadorAlBorrar,
  tramosDelFormato,
} from './mascara-fecha.directive';

function tramos(formato: string) {
  const resultado = tramosDelFormato(formato);
  expect(resultado).not.toBeNull();
  return resultado as NonNullable<typeof resultado>;
}

const FECHA = tramos('dd/mm/yy');
const MES = tramos('mm/yy');

/** `19|/10/2026` → cursor en 2. `[31]/12/2026` → selección de 0 a 2. */
function leer(marcado: string): { valor: string; inicio: number; fin: number } {
  const valor = marcado.replace(/[|[\]]/g, '');
  if (marcado.includes('|')) {
    const cursor = marcado.indexOf('|');
    return { valor, inicio: cursor, fin: cursor };
  }
  return { valor, inicio: marcado.indexOf('['), fin: marcado.indexOf(']') - 1 };
}

/** Texto con el cursor marcado, o `null` si la tecla queda en manos del navegador. */
function editar(marcado: string, tecla: string, formato = FECHA): string | null {
  const { valor, inicio, fin } = leer(marcado);
  const edicion = editarEnMedio(valor, inicio, fin, tecla, formato);
  if (!edicion) return null;
  return `${edicion.valor.slice(0, edicion.cursor)}|${edicion.valor.slice(edicion.cursor)}`;
}

describe('tramosDelFormato', () => {
  it('lee los tramos y sus separadores', () => {
    expect(FECHA.map((t) => [t.largo, t.separador])).toEqual([
      [2, '/'],
      [2, '/'],
      [4, ''],
    ]);
    expect(MES.map((t) => [t.largo, t.separador])).toEqual([
      [2, '/'],
      [4, ''],
    ]);
  });

  it('el año de una sola `y` es de dos dígitos', () => {
    expect(tramos('d.m.y').map((t) => t.largo)).toEqual([2, 2, 2]);
  });

  it.each([
    'dd M yy',
    'DD dd/mm',
    "dd 'de' mm",
    'ddd/mm',
    'o/yy',
    '@',
    '/dd/mm',
    'dd - mm - yy',
    '',
  ])('no hay máscara para `%s`', (formato) => {
    expect(tramosDelFormato(formato)).toBeNull();
  });
});

describe('aplicarMascara (tecleo al final)', () => {
  it.each([
    ['31122026', '31/12/2026'],
    ['3', '3'],
    ['4', '04/'],
    ['35', '3'],
    ['00', '0'],
    ['0/', '0'],
    ['3/', '03/'],
    ['03//', '03/'],
    ['1/2/2026', '01/02/2026'],
    ['31/12/20265', '31/12/2026'],
    ['31a', '31/'],
    ['abc', ''],
  ])('`%s` → `%s`', (crudo, esperado) => {
    expect(aplicarMascara(crudo, FECHA)).toBe(esperado);
  });

  it.each(['1-2-2026', '1.2.2026', '1 2 2026'])(
    'cualquier separador cierra el tramo: `%s`',
    (crudo) => {
      expect(aplicarMascara(crudo, FECHA)).toBe('01/02/2026');
    },
  );

  it.each([
    ['102026', '10/2026'],
    ['5', '05/'],
    ['13', '1'],
  ])('mes y año: `%s` → `%s`', (crudo, esperado) => {
    expect(aplicarMascara(crudo, MES)).toBe(esperado);
  });

  it.each(['31/12/2026', '03/', '31/1', '31/12/', '31/12/20'])(
    'no toca lo que ya está armado: `%s`',
    (texto) => {
      expect(aplicarMascara(texto, FECHA)).toBe(texto);
    },
  );
});

describe('enmascararPegado', () => {
  it.each([
    ['31/12/2026', '31/12/2026'],
    ['31122026', '31/12/2026'],
    ['1/2/2026', '01/02/2026'],
    ['31-12-2026', '31/12/2026'],
    [' 31/12/2026 ', '31/12/2026'],
    ['31/12/2026 10:30', '31/12/2026'],
    ['31/12', '31/12/'],
  ])('`%s` encaja → `%s`', (crudo, esperado) => {
    expect(enmascararPegado(crudo, FECHA)).toBe(esperado);
  });

  // Forzadas a `dd/mm/yy` darían una fecha válida y equivocada.
  it.each([
    '2026-12-31',
    '2026/12/31',
    '12/31/2026',
    '20261231',
    '2011-05-12',
    '31/12/26 10:30',
    '31/12/20265',
  ])('`%s` no encaja y se deja como llegó', (crudo) => {
    expect(enmascararPegado(crudo, FECHA)).toBeNull();
  });

  it('un año-mes ISO no encaja en `mm/yy`', () => {
    expect(enmascararPegado('2026-10', MES)).toBeNull();
    expect(enmascararPegado('10/2026', MES)).toBe('10/2026');
  });
});

describe('editarEnMedio', () => {
  it.each([
    ['|19/10/2026', '3', '3|/10/2026'],
    ['3|/10/2026', '1', '31/|10/2026'],
    ['|19/10/2026', '9', '09/|10/2026'],
    ['1|9/10/2026', '2', '12/|10/2026'],
    ['19/|10/2026', '1', '19/1|/2026'],
    ['19/1|/2026', '2', '19/12/|2026'],
    ['19/10/|2026', '1', '19/10/1|'],
    ['19/10/20|26', '3', '19/10/203|6'],
  ])('`%s` + `%s` → `%s`', (marcado, tecla, esperado) => {
    expect(editar(marcado, tecla)).toBe(esperado);
  });

  it('un dígito de más al final de un tramo lleno pasa al siguiente', () => {
    expect(editar('19|/10/2026', '5')).toBe('19/05/|2026');
  });

  it('pero no se lleva un año ya escrito', () => {
    expect(editar('19/10|/2026', '1')).toBe('19/10|/2026');
    expect(editar('10|/2026', '2', MES)).toBe('10|/2026');
  });

  it.each([
    ['3|/10/2026', '5'],
    ['3|9/10/2026', '5'],
    ['19/1|/2026', '5'],
    ['0|/10/2026', '0'],
  ])('un dígito fuera de rango no entra: `%s` + `%s`', (marcado, tecla) => {
    const { valor, inicio } = leer(marcado);
    expect(editarEnMedio(valor, inicio, inicio, tecla, FECHA)).toEqual({ valor, cursor: inicio });
  });

  it('un separador tecleado justo antes de otro solo lo cruza', () => {
    expect(editar('19|/10/2026', '/')).toBe('19/|10/2026');
    expect(editar('19|/10/2026', '-')).toBe('19/|10/2026');
  });

  it.each([
    ['19|/10/2026', 'a'],
    ['1|9/10/2026', 'a'],
    ['1|9/10/2026', '/'],
    ['[19]/10/2026', 'a'],
  ])('lo que no es dígito no entra: `%s` + `%s`', (marcado, tecla) => {
    const { valor, inicio, fin } = leer(marcado);
    expect(editarEnMedio(valor, inicio, fin, tecla, FECHA)).toEqual({ valor, cursor: inicio });
  });

  it('el dígito reemplaza lo seleccionado', () => {
    expect(editar('[31]/12/2026', '2')).toBe('2|/12/2026');
    expect(editar('31/[12]/2026', '3')).toBe('31/03/|2026');
  });

  it.each([
    ['31|12/2026', '0'],
    ['31|12/2026', '/'],
    ['31/12|2026', '1'],
    ['31/|2026', '1'],
    ['[31/12]/2026', '4'],
  ])('con el texto desarmado la tecla entra tal cual: `%s` + `%s`', (marcado, tecla) => {
    expect(editar(marcado, tecla)).toBeNull();
  });

  it('mes y año', () => {
    expect(editar('|10/2026', '5', MES)).toBe('05/|2026');
    expect(editar('|10/2026', '1', MES)).toBe('1|/2026');
  });
});

describe('saltarSeparadorAlBorrar', () => {
  it('el retroceso salta el separador de en medio', () => {
    expect(saltarSeparadorAlBorrar('31/12/2026', 3, true, FECHA)).toBe(2);
    expect(saltarSeparadorAlBorrar('31/12/2026', 6, true, FECHA)).toBe(5);
    expect(saltarSeparadorAlBorrar('31//2026', 3, true, FECHA)).toBe(2);
  });

  it('el suprimir también', () => {
    expect(saltarSeparadorAlBorrar('31/12/2026', 2, false, FECHA)).toBe(3);
  });

  it.each([
    ['un dígito', '31/12/2026', 2, true],
    ['un dígito, hacia adelante', '31/12/2026', 3, false],
    ['el separador que cierra el texto', '31/12/', 6, true],
    ['el separador que cierra el texto, hacia adelante', '31/12/', 5, false],
    ['nada: el cursor está al inicio', '31/12/2026', 0, true],
    ['algo de un texto ya desarmado', '3112/2026', 5, true],
  ])('deja seguir el borrado de %s', (_caso, valor, cursor, haciaAtras) => {
    expect(saltarSeparadorAlBorrar(valor, cursor, haciaAtras, FECHA)).toBeNull();
  });
});

@Component({
  imports: [DatePicker, MascaraFechaDirective, ReactiveFormsModule],
  template: `<p-datepicker
    [formControl]="fecha"
    [dateFormat]="formato"
    [view]="vista"
    [showTime]="conHora"
    [showOnFocus]="false"
  />`,
})
class HostComponent {
  readonly fecha = new FormControl<Date | null>(null);
  formato = 'dd/mm/yy';
  vista: 'date' | 'month' = 'date';
  conHora = false;
}

describe('MascaraFechaDirective sobre <p-datepicker>', () => {
  let fixture: ComponentFixture<HostComponent>;
  let input: HTMLInputElement;
  let emisiones: (Date | null)[];

  function montar(ajustar?: (host: HostComponent) => void): void {
    fixture = TestBed.createComponent(HostComponent);
    ajustar?.(fixture.componentInstance);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
    emisiones = [];
    fixture.componentInstance.fecha.valueChanges.subscribe((valor) => emisiones.push(valor));
  }

  function escribir(fecha: Date): void {
    fixture.componentInstance.fecha.setValue(fecha, { emitEvent: false });
    fixture.detectChanges();
  }

  /** Una tecla como la despacha el navegador: keydown, beforeinput cancelable, input. */
  function teclear(teclas: string): void {
    for (const tecla of teclas) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: tecla, bubbles: true }));
      const antes = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: tecla,
        bubbles: true,
        cancelable: true,
      });
      if (!input.dispatchEvent(antes)) continue;
      const inicio = input.selectionStart ?? input.value.length;
      const fin = input.selectionEnd ?? inicio;
      input.value = input.value.slice(0, inicio) + tecla + input.value.slice(fin);
      input.setSelectionRange(inicio + 1, inicio + 1);
      input.dispatchEvent(
        new InputEvent('input', { inputType: 'insertText', data: tecla, bubbles: true }),
      );
    }
  }

  function pegar(texto: string): void {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    input.value = texto;
    input.setSelectionRange(texto.length, texto.length);
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true }));
  }

  function retroceso(): void {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    const antes = new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
      bubbles: true,
      cancelable: true,
    });
    if (!input.dispatchEvent(antes)) return;
    const cursor = input.selectionStart ?? input.value.length;
    input.value = input.value.slice(0, cursor - 1) + input.value.slice(cursor);
    input.setSelectionRange(cursor - 1, cursor - 1);
    input.dispatchEvent(
      new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }),
    );
  }

  const valor = (): Date | null => fixture.componentInstance.fecha.value;

  it('teclear solo dígitos arma la fecha y PrimeNG la parsea', () => {
    montar();
    teclear('31122026');
    expect(input.value).toBe('31/12/2026');
    expect(valor()).toEqual(new Date(2026, 11, 31));
  });

  it('teclear con otro separador llega a la misma fecha', () => {
    montar();
    teclear('1.2.2026');
    expect(input.value).toBe('01/02/2026');
    expect(valor()).toEqual(new Date(2026, 1, 1));
  });

  it('corregir el día en medio no desarma el resto', () => {
    montar();
    escribir(new Date(2026, 9, 19));
    expect(input.value).toBe('19/10/2026');

    input.setSelectionRange(0, 0);
    teclear('31');
    expect(input.value).toBe('31/10/2026');
    expect(input.selectionStart).toBe(3);
    expect(valor()).toEqual(new Date(2026, 9, 31));
  });

  it('una tecla que no entra no vuelve a emitir la fecha', () => {
    montar();
    escribir(new Date(2026, 9, 31));
    input.setSelectionRange(1, 1);
    teclear('5');
    expect(input.value).toBe('31/10/2026');
    expect(emisiones).toEqual([]);
  });

  it('pegar una fecha en el formato la deja en el modelo', () => {
    montar();
    pegar('31-12-2026');
    expect(input.value).toBe('31/12/2026');
    expect(valor()).toEqual(new Date(2026, 11, 31));
  });

  it('pegar una fecha en otro orden no inventa una fecha', () => {
    montar();
    pegar('2026-12-31');
    expect(input.value).toBe('2026-12-31');
    expect(valor()).toBeNull();
  });

  it('el retroceso no se lleva un separador de en medio', () => {
    montar();
    escribir(new Date(2026, 11, 31));
    input.setSelectionRange(3, 3);
    retroceso();
    expect(input.value).toBe('31/12/2026');
    expect(input.selectionStart).toBe(2);

    retroceso();
    expect(input.value).toBe('3/12/2026');
  });

  it('al final el retroceso sí borra el separador recién puesto', () => {
    montar();
    teclear('3112');
    expect(input.value).toBe('31/12/');
    retroceso();
    expect(input.value).toBe('31/12');
  });

  it('sirve para el `mm/yy` de selección de mes', () => {
    montar((host) => {
      host.formato = 'mm/yy';
      host.vista = 'month';
    });
    teclear('102026');
    expect(input.value).toBe('10/2026');
    expect(valor()).toEqual(new Date(2026, 9, 1));
  });

  it('se aparta cuando el datepicker lleva hora', () => {
    montar((host) => (host.conHora = true));
    teclear('3112');
    expect(input.value).toBe('3112');
  });
});
