// Datos del negocio responsable de APS Intelligence. Se usan en los documentos legales,
// el pie de la pantalla de ingreso y el pedido de eliminación de cuenta.
export const BUSINESS = {
  name: 'APS Developer',
  product: 'APS Intelligence',
  country: 'Argentina',
  email: 'apsdeveloper.arg@gmail.com',
  whatsappDisplay: '+54 9 3755 301413',
  whatsappUrl: 'https://wa.me/5493755301413',
  instagram: '@aps_developer',
  instagramUrl: 'https://instagram.com/aps_developer',
  supportUrl: 'https://aps-support.vercel.app/',
} as const;

// Versión de los textos legales. Se guarda junto al alta de cada cuenta nueva.
export const LEGAL_VERSION = '2026-11-15';
export const LEGAL_UPDATED_LABEL = '15 de noviembre de 2026';

/** Correo ya redactado para pedir la eliminación de la cuenta y de los datos. */
export function deletionRequestUrl(accountEmail?: string): string {
  const subject = 'Eliminar mi cuenta de APS Intelligence';
  const body = [
    'Hola, quiero eliminar mi cuenta de APS Intelligence y todos mis datos asociados.',
    '',
    `Correo de la cuenta: ${accountEmail || '(escribilo acá)'}`,
  ].join('\n');
  return `mailto:${BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
