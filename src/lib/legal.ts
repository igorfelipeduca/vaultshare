// Legal details shown on the privacy policy. Review with the company's legal team before publishing:
// the controller's identification and the DPO (encarregado) contact are required by LGPD art. 9 and 41, and the
// processors list (art. 9, V and art. 33) must match the providers and regions actually in use.
export const LEGAL = {
  controller: 'VaultShare',
  dpoEmail: 'privacidade@vaultshare.app',
  updatedAt: '25 de novembro de 2026',
  // Providers that process personal data on the controller's behalf (operadores, LGPD art. 5, VII).
  processors: [
    { name: 'Vercel Inc.', role: 'hospedagem do site', country: 'Estados Unidos' },
    {
      name: 'Railway Corporation',
      role: 'hospedagem da API, do banco de dados e dos arquivos',
      country: 'Estados Unidos',
    },
  ],
  // Marco Civil da Internet (Lei nº 12.965/2014), art. 15: application access logs are kept for 6 months.
  accessLogMonths: 6,
}
