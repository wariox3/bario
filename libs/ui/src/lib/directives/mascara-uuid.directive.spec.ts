import { FormControl } from '@angular/forms';
import { formatearUuid, uuidValidator } from './mascara-uuid.directive';

describe('formatearUuid', () => {
  it('pone los guiones en 8-4-4-4-12', () => {
    expect(formatearUuid('94966156808442 8bb1b1a903a053aed1')).toBe(
      '94966156-8084-428b-b1b1-a903a053aed1',
    );
  });

  it('no deja un guion colgando al final', () => {
    expect(formatearUuid('94966156')).toBe('94966156');
    expect(formatearUuid('949661568')).toBe('94966156-8');
  });

  it('descarta lo que no es hexadecimal, pasa a minúsculas y corta en 32', () => {
    expect(formatearUuid(' 9496-6156-ZZ-8084-428B-B1B1-A903A053AED1-FFFF ')).toBe(
      '94966156-8084-428b-b1b1-a903a053aed1',
    );
  });
});

describe('uuidValidator', () => {
  it('acepta solo un UUID completo', () => {
    expect(uuidValidator(new FormControl('94966156-8084-428b-b1b1-a903a053aed1'))).toBeNull();
    expect(uuidValidator(new FormControl('94966156-8084-428b'))).not.toBeNull();
  });
});
