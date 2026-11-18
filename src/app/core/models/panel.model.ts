import { Activity } from './activity.model';
import { ProjectPenalties } from './penalty.model';
import { Project } from './project.model';
import { Submission } from './submission.model';

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

export interface Panel {
  projetos: Project[];
  atividades: Activity[];
  entregas: Submission[];
  penalidades: ProjectPenalties[];
}
