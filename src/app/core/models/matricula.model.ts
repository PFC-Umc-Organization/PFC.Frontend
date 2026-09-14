import { StatusUsuario } from './usuario.model';

export interface Matricula {
  rgm: string;
  status: StatusUsuario;
}

export interface FalhaMatricula {
  rgm: string;
  erro: string;
}

export interface ResultadoMatricula {
  processados: number;
  falhas: FalhaMatricula[];
}
