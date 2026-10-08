import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { BaseHttpService, Ciudad, IdentificacionService, PaginatedResponse } from '@reddoc/core';
import {
  BillingProfile,
  BillingProfileDraft,
  BillingProfilePayload,
} from '../models/billing-profile.model';

/**
 * Forma cruda del contacto tal como llega de `/contenedor/contacto/lista-usuario/`
 * (`CtnContactoListaUsuario`). `departamento_nombre` solo lo trae este listado:
 * el detalle por id (`CtnContacto`) se queda en `ciudad_nombre`.
 */
interface ContactoApi {
  readonly id: number;
  readonly numero_identificacion: string;
  readonly digito_verificacion: string | null;
  readonly nombre_corto: string;
  readonly direccion: string;
  readonly celular: string;
  readonly correo: string;
  readonly identificacion: number;
  readonly ciudad: number;
  readonly ciudad_nombre: string;
  readonly departamento_nombre: string | null;
  readonly usuario: number;
}

@Injectable({ providedIn: 'root' })
export class BillingProfilesService extends BaseHttpService {
  private readonly identificacionService = inject(IdentificacionService);

  list(): Observable<BillingProfile[]> {
    return forkJoin({
      page: this.get<PaginatedResponse<ContactoApi>>('/contenedor/contacto/lista-usuario/'),
      tipos: this.identificacionService.list(),
    }).pipe(
      map(({ page, tipos }) => {
        const tipoById = new Map(tipos.map((t) => [t.id, t.nombre] as const));
        return page.results.map<BillingProfile>((c) => ({
          id: c.id,
          tipo: tipoById.get(c.identificacion) ?? '',
          numero: c.numero_identificacion,
          nombre: c.nombre_corto,
          email: c.correo,
          celular: c.celular,
          direccion: c.direccion,
          ciudad: c.ciudad_nombre,
          ciudad_id: c.ciudad,
          departamento: c.departamento_nombre,
        }));
      }),
    );
  }

  create(draft: BillingProfileDraft): Observable<BillingProfile> {
    const { tipo, ciudad, payload } = this.prepare(draft);
    return this.post<{ id: number }>('/contenedor/contacto/', payload).pipe(
      map((res) => this.toView(res.id, draft, tipo, ciudad)),
    );
  }

  update(id: number, draft: BillingProfileDraft): Observable<BillingProfile> {
    const { tipo, ciudad, payload } = this.prepare(draft);
    return this.patch<{ id: number }>(`/contenedor/contacto/${id}/`, payload).pipe(
      map(() => this.toView(id, draft, tipo, ciudad)),
    );
  }

  remove(id: number): Observable<void> {
    return this.delete<void>(`/contenedor/contacto/${id}/`);
  }

  private prepare(draft: BillingProfileDraft): {
    tipo: { id: number; nombre: string };
    ciudad: Ciudad;
    payload: BillingProfilePayload;
  } {
    const tipo = draft.identificacion;
    const ciudad = draft.ciudad;
    if (!tipo || !ciudad) {
      throw new Error('BillingProfileDraft inválido: identificacion y ciudad son obligatorias.');
    }
    return {
      tipo,
      ciudad,
      payload: {
        identificacion: tipo.id,
        numero_identificacion: draft.numero,
        nombre_corto: draft.nombre,
        correo: draft.email,
        celular: draft.celular,
        direccion: draft.direccion,
        ciudad: ciudad.id,
      },
    };
  }

  private toView(
    id: number,
    draft: BillingProfileDraft,
    tipo: { id: number; nombre: string },
    ciudad: Ciudad,
  ): BillingProfile {
    return {
      id,
      tipo: tipo.nombre,
      numero: draft.numero,
      nombre: draft.nombre,
      email: draft.email,
      celular: draft.celular,
      direccion: draft.direccion,
      // El departamento viene del `Ciudad` elegido en el autocomplete, así que la
      // tarjeta se lee igual recién guardada que al recargar desde el listado.
      ciudad: ciudad.nombre,
      ciudad_id: ciudad.id,
      departamento: ciudad.departamento_nombre ?? null,
    };
  }
}
