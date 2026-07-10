export interface BaseUsuario {
  id: number;
  email: string;
  role?: string;
  nombre_corto?: string | null;
  celular?: string | null;
  imagen?: string | null;
  imagen_thumbnail?: string | null;
}

export interface Usuario extends BaseUsuario {
  nombre_corto: string | null;
  numero_identificacion: string | null;
  celular: string | null;
  idioma: string;
  imagen: string | null;
  imagen_thumbnail: string | null;
  is_verified: boolean;
  fecha_creacion: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface AuthResponse<TUser = BaseUsuario> {
  user: TUser;
}

export interface ResendVerificationRequest {
  email: string;
  turnstile_token: string;
}

export interface RegisterRequest {
  nombre_corto: string;
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface RegisteredUser {
  id: number;
  email: string;
  role: string;
  nombres: string;
  apellidos: string;
  numero_identificacion: string;
  is_verified: boolean;
}

export interface RegisterResponse {
  user: RegisteredUser;
  verification_link: string;
}
