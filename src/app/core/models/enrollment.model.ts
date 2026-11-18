import { UserStatus } from './user.model';

// ---------------------------------------------------------------------------
// Matrículas
// ---------------------------------------------------------------------------

export interface Enrollment {
  rgm: string;
  status: UserStatus;
  turmaId?: string;
}

// Falha
export interface EnrollmentFailure {
  rgm: string;
  erro: string;
}

// Resultado
export interface EnrollmentResult {
  processados: number;
  falhas: EnrollmentFailure[];
}
