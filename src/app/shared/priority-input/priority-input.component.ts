
import { Component, forwardRef, Input } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';

@Component({
  selector: 'app-priority-input',
  standalone: true,
  template: `
    <input
      type="text"
      inputmode="numeric"
      class="form-control"
      [class.form-control-sm]="small"
      [class.is-invalid]="invalid"
      [value]="display"
      [disabled]="disabled"
      [readOnly]="readonly"
      [attr.aria-label]="ariaLabel"
      (focus)="onFocus()"
      (input)="onInput($event)"
      (blur)="onBlur()"
    />
    @if (invalid) {
      <div class="invalid-feedback d-block">
        Invalid. Maximum Level: {{ maxId }}.
      </div>
    }
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PriorityInputComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => PriorityInputComponent), multi: true }
  ]
})
export class PriorityInputComponent implements ControlValueAccessor, Validator {
  @Input() priorities: IPriority[] = [];
  @Input() small = false;
  @Input() readonly = false;
  @Input() ariaLabel = 'Priority';

  display = 'N/A';
  invalid = false;
  disabled = false;

  private focused = false;
  private value = 0;
  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  get maxId(): number {
    return Math.max(0, ...this.priorities.filter(p => p.IsActive !== false).map(p => p.Id));
  }

  writeValue(value: number | null): void {
    this.value = value ?? 0;
    this.invalid = !this.isValid(this.value);
    if (!this.focused) this.render();
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    return this.isValid(control.value ?? 0) ? null : { invalidPriority: true };
  }

  onFocus(): void {
    if (this.disabled || this.readonly) return;
    this.focused = true;
    this.display = this.value === 0 ? '' : String(this.value);
  }

  onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.display = text;

    if (text.trim() === '') {
      this.value = 0;
      this.invalid = false;
    } else {
      const parsed = Number(text);
      this.invalid = !/^\d+$/.test(text) || !this.isValid(parsed);
      this.value = this.invalid ? Number.NaN : parsed;
    }

    this.onChange(this.value);
    this.onValidatorChange();
  }

  onBlur(): void {
    this.focused = false;
    this.onTouched();
    if (!this.invalid) this.render();
  }

  private render(): void {
    const priority = this.priorities.find(p => p.Id === this.value);
    this.display = priority?.PriorityName ?? (this.value === 0 ? 'N/A' : String(this.value));
  }

  private isValid(value: number): boolean {
    return Number.isSafeInteger(value) &&
      this.priorities.some(p => p.Id === value && p.IsActive !== false);
  }
}
