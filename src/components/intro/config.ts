export interface ConfigIntro {
  /** Nombre del producto o tenant (ej. 'OnlyERP' o el nombre de la empresa) */
  producto: string
  /** Área o contexto del servicio (arriba a la izquierda) */
  area: string
  /** Qué hace la plataforma en una frase: subtítulo del nombre */
  bajada: string
  /** Logo personalizado del tenant */
  logoUrl?: string | null
  /** Subtítulo descriptivo en la tarjeta */
  subtituloCard?: string
}

export const INTRO_DEFAULT: ConfigIntro = {
  producto: 'OnlyERP',
  area: 'NanoLabs · Business Cloud',
  bajada: 'Sistema integral de gestión comercial, inventario y facturación.',
  subtituloCard: 'Sistema de Gestión Empresarial',
}
