import { UserStatus } from './user.model';

export interface Enrollment {
  rgm: string;
  status: UserStatus;
  turmaId?: string;
}

export interface EnrollmentFailure {
  rgm: string;
  erro: string;
}

export interface EnrollmentResult {
  processados: number;
  falhas: EnrollmentFailure[];
}
