import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SoloDigitosDirective } from './solo-digitos.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, SoloDigitosDirective],
  template: `<input [libSoloDigitos]="activa()" [formControl]="control" />`,
})
class HostComponent {
  readonly activa = signal(true);
  readonly control = new FormControl('', { nonNullable: true });
}

describe('SoloDigitosDirective', () => {
  function escribir(valor: string, activa: boolean) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.activa.set(activa);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    return { input, control: fixture.componentInstance.control };
  }

  it('encendida, deja solo los dígitos en la vista y en el control', () => {
    const { input, control } = escribir('1.020.345-678', true);
    expect(input.value).toBe('1020345678');
    expect(control.value).toBe('1020345678');
  });

  it('apagada, no toca lo escrito (un pasaporte conserva sus letras)', () => {
    const { input, control } = escribir('AB123456', false);
    expect(input.value).toBe('AB123456');
    expect(control.value).toBe('AB123456');
  });
});
