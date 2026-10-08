/**
 * `sebastian.h.piedrahita@gmail.com` → `s•••@gmail.com`.
 *
 * Deja lo justo para que el dueño lo reconozca y no lo suficiente para que un tercero lo
 * anote. Se usa donde hay que decir a dónde se mandó un código sin exponer la dirección
 * —incluido el login, que es pre-sesión—.
 */
export function enmascararEmail(email: string): string {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return email;
  return `${usuario.slice(0, 1)}•••@${dominio}`;
}

/** `3001234821` → `••• ••• 4821`. Los últimos cuatro alcanzan para reconocerlo. */
export function enmascararCelular(celular: string): string {
  const digitos = celular.replace(/\D/g, '');
  return digitos.length < 4 ? '•••' : `••• ••• ${digitos.slice(-4)}`;
}

export function getInitials(name: string, fallback = '?'): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
