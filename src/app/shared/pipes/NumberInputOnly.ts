import { AbstractControl } from "@angular/forms";

export class InputHelper {
  static numbersOnly(event: any, control: AbstractControl | null) {
    const value = event.target.value.replace(/[^0-9]/g, '');
    control?.setValue(value, { emitEvent: false });
  }
}