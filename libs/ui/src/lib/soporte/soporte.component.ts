import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { APP_BRANDING, I18nService, TenantService } from '@reddoc/core';
import type { SoporteTranslationsHost } from './i18n';
import { SOPORTE_CONTACTO } from './soporte.constants';

/** Gracia al salir con el mouse antes de cerrar; la misma del app-switcher. */
const CLOSE_DELAY_MS = 150;
/** Un clic tan cerca de la apertura por hover es el mismo gesto, no un cierre. */
const HOVER_CLICK_MS = 400;
const COPIADO_MS = 1600;

/**
 * Contacto con soporte — va en `app-header__actions`, antes del app-switcher.
 * El header es lo único presente en todas las pantallas (el sidebar no existe en
 * el selector de empresas ni en el inicio del ERP, y en móvil es un drawer).
 *
 * El mensaje (WhatsApp o correo) sale con la empresa, la app y la pantalla ya
 * escritas: es lo primero que soporte pregunta. El panel muestra esos datos para que se sepa qué viaja.
 */
@Component({
  selector: 'lib-soporte',
  standalone: true,
  templateUrl: './soporte.component.html',
  styles: `
    :host {
      position: relative;
      display: flex;
      align-items: center;
    }

    .soporte-panel {
      animation: soporte-in 0.12s ease;
    }

    @keyframes soporte-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  host: { '(mouseenter)': 'onEnter()', '(mouseleave)': 'onLeave()' },
})
export class SoporteComponent {
  private readonly i18n = inject<I18nService<SoporteTranslationsHost>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly branding = inject(APP_BRANDING, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly t = this.i18n.t;
  protected readonly contacto = SOPORTE_CONTACTO;

  protected readonly open = signal(false);
  protected readonly copiado = signal(false);
  /** Ruta en la que se abrió el panel: la pantalla sobre la que se pide ayuda. */
  private readonly pantalla = signal('');

  private closeTimer?: ReturnType<typeof setTimeout>;
  private copiadoTimer?: ReturnType<typeof setTimeout>;
  private abiertoPorHover = 0;

  protected readonly empresa = computed(
    () => this.tenant.currentContenedor()?.cliente_nombre ?? this.tenant.currentSlug() ?? '',
  );
  protected readonly app = this.branding?.appName ?? '';

  /** Empresa, app y pantalla como líneas `Etiqueta: valor`; viajan en ambos canales. */
  private readonly datos = computed(() => {
    const dict = this.t().soporte;
    return [
      [dict.empresa, this.empresa()],
      [dict.aplicacion, this.app],
      [dict.pantalla, this.pantalla()],
    ]
      .filter(([, valor]) => valor)
      .map(([etiqueta, valor]) => `${etiqueta}: ${valor}`);
  });

  protected readonly whatsappHref = computed(() => {
    const mensaje = [this.t().soporte.saludo, '', ...this.datos()].join('\n');
    const numero = SOPORTE_CONTACTO.whatsapp.replace(/\D/g, '');
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  });

  protected readonly correoHref = computed(() => {
    const dict = this.t().soporte;
    const asunto = [dict.asunto.replace('{app}', this.app).trim(), this.empresa()]
      .filter(Boolean)
      .join(' · ');
    const cuerpo = ['', '', '---', ...this.datos()].join('\r\n');
    return (
      `mailto:${SOPORTE_CONTACTO.correo}` +
      `?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
    );
  });

  protected onEnter(): void {
    this.cancelClose();
    if (!this.open()) {
      this.abiertoPorHover = Date.now();
      this.abrir();
    }
  }

  protected onLeave(): void {
    this.cancelClose();
    this.closeTimer = setTimeout(() => this.open.set(false), CLOSE_DELAY_MS);
  }

  /**
   * Clic/tap sobre el botón. Con mouse el hover ya abrió el panel, y en touch el
   * tap dispara `mouseenter` justo antes: en ambos casos ese clic no debe cerrar
   * lo que acaba de abrirse.
   */
  protected toggle(): void {
    this.cancelClose();
    if (this.open() && Date.now() - this.abiertoPorHover < HOVER_CLICK_MS) return;
    if (this.open()) this.open.set(false);
    else this.abrir();
  }

  protected copiarCorreo(): void {
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!clipboard) return;
    // Si el navegador niega el portapapeles no hay nada que avisar: la dirección
    // sigue a la vista para copiarla a mano.
    clipboard.writeText(SOPORTE_CONTACTO.correo).then(
      () => {
        this.copiado.set(true);
        clearTimeout(this.copiadoTimer);
        this.copiadoTimer = setTimeout(() => this.copiado.set(false), COPIADO_MS);
      },
      () => undefined,
    );
  }

  private abrir(): void {
    this.pantalla.set(this.document.location.pathname);
    this.open.set(true);
  }

  private cancelClose(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event.target'])
  protected onDocumentClick(target: EventTarget | null): void {
    if (this.open() && target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }
}
