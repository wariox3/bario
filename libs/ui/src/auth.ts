/**
 * Entry point de las páginas de auth.
 *
 * Separado del barrel (`index.ts`) a propósito: cada app carga estas páginas
 * eager (`component:` en sus rutas), y importarlas desde el barrel metía en el
 * bundle inicial todo lo que el barrel re-exporta y alguna pantalla lazy también
 * usa (selects, autocompletes, el datepicker…). Por este entry point solo entra
 * lo que las páginas necesitan.
 */
export { LoginComponent } from './lib/auth/login/login.component';
export { RegisterComponent } from './lib/auth/register/register.component';
export { ForgotPasswordComponent } from './lib/auth/forgot-password/forgot-password.component';
export { ResetPasswordComponent } from './lib/auth/reset-password/reset-password.component';
export { ResendVerificationComponent } from './lib/auth/resend-verification/resend-verification.component';
export { VerifyEmailComponent } from './lib/auth/verify-email/verify-email.component';
