export type Perfil = {
  id: string;
  nombre: string;
  foto_url: string | null;
  talla_ropa: string | null;
  talla_calzado: string | null;
  colores_favoritos: string | null;
  me_gusta: string | null;
  no_me_gusta: string | null;
};

export type PerfilCorto = Pick<Perfil, "id" | "nombre" | "foto_url">;

export type Deseo = {
  id: string;
  usuario_id: string;
  descripcion: string;
  link: string | null;
  precio_aprox: number | null;
  imagen_url: string | null;
  prioridad: number;
  creado_en: string;
};

export type EstadoEvento = "abierto" | "sorteado" | "terminado";

export type Evento = {
  id: string;
  organizador_id: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string | null;
  lugar: string | null;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  moneda: string;
  codigo_invitacion: string;
  estado: EstadoEvento;
  sorteado_en: string | null;
};

/** Un lugar en el intercambio: lo crea el organizador por nombre y luego alguien lo reclama con su cuenta. */
export type Participante = {
  id: string;
  nombre: string;
  usuario_id: string | null;
  perfil: PerfilCorto | null;
};

export const nombreDe = (p: Pick<Participante, "nombre" | "perfil">) => p.perfil?.nombre || p.nombre;

export type MiAmigo = {
  asignacion_id: string;
  participante_id: string;
  usuario_id: string | null;
  nombre: string;
  revelado_en: string;
};

export type Pregunta = { id: number; texto: string; emoji: string | null };
export type RespuestaRapida = { id: number; texto: string };

export type MensajeSanta = {
  id: string;
  autor: "santa" | "festejado";
  texto: string | null;
  emoji: string | null;
  creado_en: string;
  pregunta: { texto: string; emoji: string | null } | null;
};

export type MensajeRecibido = {
  hilo_id: string;
  mensaje_id: string;
  autor: "santa" | "festejado";
  pregunta: string | null;
  pregunta_emoji: string | null;
  texto: string | null;
  emoji: string | null;
  creado_en: string;
  leido_en: string | null;
};
