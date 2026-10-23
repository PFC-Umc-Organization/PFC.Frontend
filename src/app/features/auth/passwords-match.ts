import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Group validator for a password and its confirmation. */
export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { senha, confirmacao } = group.value as { senha: string; confirmacao: string };
  return confirmacao && senha !== confirmacao ? { diferentes: true } : null;
}
