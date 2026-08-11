export interface AuthDict {
  brandPanel: {
    feature1: string;
    feature2: string;
    feature3: string;
  };
  backToHome: string;
  backToLogin: string;
  fields: {
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    name: string;
    namePlaceholder: string;
    newPassword: string;
    confirmPassword: string;
  };
  validation: {
    emailRequired: string;
    emailInvalid: string;
    passwordRequired: string;
    passwordMin6: string;
    passwordMin8: string;
    passwordConfirmRequired: string;
    passwordMismatch: string;
    nameRequired: string;
    nameMin2: string;
  };
  login: {
    title: string;
    subtitle: string;
    forgotLink: string;
    submit: string;
    noAccount: string;
    registerLink: string;
    errors: { invalidCredentials: string };
    mfa: {
      title: string;
      subtitle: string;
      remember: string;
      rememberHint: string;
      submit: string;
      back: string;
      errors: { invalidCode: string; sessionUnconfirmed: string };
    };
  };
  /**
   * Textos de `lib-mfa-codigo-input`. Va suelto y no bajo `login` porque el mismo
   * componente se usa fuera del login (el modal de seguridad de `cuenta`).
   *
   * Los `…Prefix`/`…Suffix` son para intercalar el largo del código, que sale de una
   * constante y no del diccionario.
   */
  mfaCodigo: {
    totpHint: string;
    sentToLabel: string;
    sentGeneric: string;
    expiredBadge: string;
    expiredTitle: string;
    remainingTitle: string;
    codeLabelPrefix: string;
    codeLabelSuffix: string;
    backupLabel: string;
    backupOnce: string;
    expiredRestart: string;
    expiredResend: string;
    useBackup: string;
    useCodePrefix: string;
    useCodeSuffix: string;
    notReceived: string;
    resend: string;
  };
  register: {
    title: string;
    subtitle: string;
    submit: string;
    alreadyHaveAccount: string;
    loginLink: string;
    terms: { acceptPrefix: string; link: string; dialogTitle: string };
    success: { title: string; desc: string; goLogin: string };
    errors: { generic: string };
  };
  forgotPassword: {
    title: string;
    subtitle: string;
    submit: string;
    success: { title: string; desc: string };
    errors: { generic: string };
  };
  resetPassword: {
    title: string;
    subtitle: string;
    submit: string;
    success: { title: string; desc: string; goLogin: string };
    errors: { generic: string };
  };
  verifyEmail: {
    loading: { title: string; desc: string };
    success: { title: string; desc: string; action: string };
    error: { title: string; action: string };
    errors: { generic: string };
  };
  resendVerification: {
    unverifiedAlert: string;
    title: string;
    subtitle: string;
    submit: string;
    success: {
      title: string;
      desc: string;
      cooldownPrefix: string;
      cooldownSuffix: string;
      resend: string;
    };
    errors: { generic: string };
  };
}

export interface AuthTranslationsHost {
  auth: AuthDict;
}
