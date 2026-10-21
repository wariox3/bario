import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputNumber } from 'primeng/inputnumber';
import { interpretarNumeroPegado, PegarNumeroDirective } from './pegar-numero.directive';

describe('interpretarNumeroPegado', () => {
  it.each([
    ['5000.6', 5000.6],
    ['5000,6', 5000.6],
    ['5.000,6', 5000.6],
    ['5,000.6', 5000.6],
    ['16065.00', 16065],
    ['16.065', 16065],
    ['1.234.567', 1234567],
    ['1,234,567', 1234567],
    ['1.234.567,89', 1234567.89],
    ['$ 70.000,00', 70000],
    ['  200 ', 200],
    ['-5000.6', -5000.6],
    ['0.5', 0.5],
  ])('%s → %d', (texto, esperado) => {
    expect(interpretarNumeroPegado(texto)).toBe(esperado);
  });

  it.each(['', 'abc', '$', '-'])('«%s» no es un número', (texto) => {
    expect(interpretarNumeroPegado(texto)).toBeNull();
  });
});

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, InputNumber, PegarNumeroDirective],
  template: `
    <p-inputnumber
      [formControl]="valor"
      mode="decimal"
      locale="es-CO"
      [minFractionDigits]="0"
      [maxFractionDigits]="2"
      prefix="$ "
    />
  `,
})
class HostComponent {
  readonly valor = new FormControl<number | null>(null);
}

describe('PegarNumeroDirective', () => {
  function pegar(texto: string): { valor: number | null; mostrado: string } {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const evento = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(evento, 'clipboardData', { value: { getData: () => texto } });
    input.dispatchEvent(evento);
    fixture.detectChanges();
    return { valor: fixture.componentInstance.valor.value, mostrado: input.value };
  }

  it('conserva el decimal de un valor copiado con punto', () => {
    expect(pegar('5000.6')).toEqual({ valor: 5000.6, mostrado: '$ 5.000,6' });
  });

  it('lee la notación local', () => {
    expect(pegar('70.000,00').valor).toBe(70000);
  });

  it('deja a PrimeNG lo que no es un número', () => {
    expect(pegar('abc').valor).toBeNull();
  });
});
