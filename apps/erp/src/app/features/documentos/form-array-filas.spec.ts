import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { agregarFilas, reemplazarFilas } from './form-array-filas';

const fila = (n: number) => new FormControl(n);

describe('agregarFilas / reemplazarFilas', () => {
  it('agregar emite una sola vez, también hacia el form padre', () => {
    const array = new FormArray([fila(1)]);
    const form = new FormGroup({ detalles: array });
    const delArray: unknown[] = [];
    const delForm: unknown[] = [];
    array.valueChanges.subscribe((v) => delArray.push(v));
    form.valueChanges.subscribe((v) => delForm.push(v));

    agregarFilas(array, [fila(2), fila(3), fila(4)]);

    expect(delArray).toEqual([[1, 2, 3, 4]]);
    expect(delForm).toEqual([{ detalles: [1, 2, 3, 4] }]);
  });

  it('agregar nada no emite', () => {
    const array = new FormArray([fila(1)]);
    const emisiones = jest.fn();
    array.valueChanges.subscribe(emisiones);

    agregarFilas(array, []);

    expect(emisiones).not.toHaveBeenCalled();
  });

  it('reemplazar deja solo las filas nuevas y emite una vez', () => {
    const array = new FormArray([fila(1), fila(2)]);
    const emisiones: unknown[] = [];
    array.valueChanges.subscribe((v) => emisiones.push(v));

    reemplazarFilas(array, [fila(7), fila(8)]);

    expect(array.value).toEqual([7, 8]);
    expect(emisiones).toEqual([[7, 8]]);
  });

  it('reemplazar por nada avisa que el array quedó vacío', () => {
    const array = new FormArray([fila(1)]);
    const emisiones: unknown[] = [];
    array.valueChanges.subscribe((v) => emisiones.push(v));

    reemplazarFilas(array, []);

    expect(emisiones).toEqual([[]]);
  });

  it('la validez del array refleja las filas agregadas en silencio', () => {
    const array = new FormArray<FormControl<number | null>>([]);
    const invalida = new FormControl<number | null>(null, (c) =>
      c.value == null ? { required: true } : null,
    );

    agregarFilas(array, [invalida]);

    expect(array.invalid).toBe(true);
  });
});
