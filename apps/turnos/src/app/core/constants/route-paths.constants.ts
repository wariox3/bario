export const ROUTE_PATHS = {
  auth: {
    login: '/auth/login',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/restablecer-clave',
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
  },
  contenedores: {
    root: '/contenedores',
  },
  tenant: {
    /** Home del tenant en la app turnos: la pantalla de inicio. */
    home: (slug: string) => `/t/${slug}/inicio`,
  },
};
