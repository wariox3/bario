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
    dashboard: (slug: string) => `/t/${slug}/dashboard`,
    /** Puerta de entrada al tenant: el inicio del módulo General. */
    home: (slug: string) => `/t/${slug}/general/inicio`,
  },
};
