import { Component } from '@angular/core';

import { CONTACTO } from '../contacto.constants';

@Component({
  selector: 'app-whatsapp-button',
  standalone: true,
  templateUrl: './whatsapp-button.component.html',
  styleUrl: './whatsapp-button.component.scss',
})
export class WhatsappButtonComponent {
  protected readonly whatsappUrl = CONTACTO.whatsappUrl;
}
