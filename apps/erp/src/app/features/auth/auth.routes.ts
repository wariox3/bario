import { Routes } from '@angular/router';
import { publicGuard } from '@reddoc/core';
import {
  ForgotPasswordComponent,
  LoginComponent,
  RegisterComponent,
  ResendVerificationComponent,
  ResetPasswordComponent,
  VerifyEmailComponent,
} from '@reddoc/ui/auth';

export const AUTH_ROUTES: Routes = [
  { path: 'login', canActivate: [publicGuard], component: LoginComponent },
  { path: 'forgot-password', canActivate: [publicGuard], component: ForgotPasswordComponent },
  { path: 'restablecer-clave', canActivate: [publicGuard], component: ResetPasswordComponent },
  { path: 'register', canActivate: [publicGuard], component: RegisterComponent },
  { path: 'verify-email', canActivate: [publicGuard], component: VerifyEmailComponent },
  {
    path: 'resend-verification',
    canActivate: [publicGuard],
    component: ResendVerificationComponent,
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
