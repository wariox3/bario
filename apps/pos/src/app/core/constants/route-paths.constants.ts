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
    /** Home del tenant en el POS: la caja, donde se vende. */
    home: (slug: string) => `/t/${slug}/caja`,
  },
};
