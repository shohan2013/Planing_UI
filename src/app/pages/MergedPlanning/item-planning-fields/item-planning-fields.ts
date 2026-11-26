import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';
import { IRecipe } from 'src/app/core/model/Common/Recipe/Recipe';
import { IMergedPlanningLine } from 'src/app/core/model/MergedPlanning/merged-planning-model';
import { IItemPlanningInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { ItemPlanningStateService } from 'src/app/core/services/MergedPlanning/item-planning-state-service';
import { ProcessStepStateService } from 'src/app/core/services/MergedPlanning/process-step-state-service';

@Component({
  selector: 'app-item-planning-fields',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, NgSelectModule],
  templateUrl: './item-planning-fields.html',
  styleUrl: './item-planning-fields.scss',
})
export class ItemPlanningFields implements OnInit, OnChanges {
  @Input({ required: true }) line!: IMergedPlanningLine;
  @Input() priorities: IPriority[] = [];
  @Input() recipeVersions: IRecipe[] = [];
  /**
   * Subtract Planned Qty from Merged Qty before comparing with Taken Qty.
   * On for merged planning (other plans already used that qty); off for the
   * planning edit view, where PlannedQuantity includes the plan being edited.
   */
  @Input() subtractPlannedQty = true;

  form = new FormGroup({
    takenQty: new FormControl<number | null>(null),
    advanceProductionQty: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    recipeVersionId: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    priorityId: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
  });

  constructor(
    private itemPlanningStateService: ItemPlanningStateService,
    private processStepStateService: ProcessStepStateService,
  ) {}

  ngOnInit(): void {
    // Runs first so the auto-computed Advance Qty is settled before
    // updateState (subscribed below) reads the form's raw value.
    this.form.controls.takenQty.valueChanges.subscribe(() => {
      this.syncAdvanceQtyWithOverage();
    });

    this.form.valueChanges.subscribe(() => {
      this.updateState();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['line'] || !this.line) {
      return;
    }

    this.form.patchValue(
      {
        takenQty: this.line.TakenQty ?? null,
        advanceProductionQty: this.line.AdvanceProductionQty ?? null,
        recipeVersionId: this.line.RecipeVersionId ?? null,
        priorityId: this.line.PriorityId ?? null,
      },
      {
        emitEvent: false,
      },
    );

    this.syncAdvanceQtyOnLoad();
    this.updateState();
  }

  /**
   * On load, an Advance Qty that came with the line (a saved plan) is shown
   * as-is; otherwise it's calculated from Taken Qty. After load, every Taken
   * Qty change recalculates it (see syncAdvanceQtyWithOverage).
   */
  private syncAdvanceQtyOnLoad(): void {
    const saved = this.line.AdvanceProductionQty ?? null;
    if (saved === null) {
      this.syncAdvanceQtyWithOverage();
      return;
    }

    const advanceControl = this.form.controls.advanceProductionQty;
    if (saved > 0) {
      advanceControl.enable({ emitEvent: false });
    } else {
      advanceControl.disable({ emitEvent: false });
    }
    advanceControl.setValue(saved, { emitEvent: false });
  }

  /** Qty already covered by saved plans for this DO line. */
  get plannedQty(): number {
    return this.line.PlannedQuantity ?? 0;
  }

  /**
   * Qty Taken Qty can use before the rest becomes Advance Qty:
   * Merged Qty - Planned Qty, or just Merged Qty when subtractPlannedQty is off.
   */
  get availableQty(): number {
    const planned = this.subtractPlannedQty ? this.plannedQty : 0;
    return Math.max(0, this.line.Quantity - planned);
  }

  /** Remaining Qty = available Qty - Taken Qty, floored at 0 for display. */
  get remainingQty(): number {
    const takenQty = this.form.controls.takenQty.value ?? 0;
    return Math.max(0, this.availableQty - takenQty);
  }

  /** Advance Qty: how far Taken Qty goes over the available Qty (0 when it doesn't). */
  get overageQty(): number {
    if (this.isTakenQtyInvalid) return 0;

    const takenQty = this.form.controls.takenQty.value ?? 0;
    return Math.max(0, takenQty - this.availableQty);
  }

  get isOverAvailableQty(): boolean {
    return this.overageQty > 0;
  }

  get isTakenQtyInvalid(): boolean {
    const value = this.form.controls.takenQty.value;
    return value !== null && value < 0;
  }

  get isAdvanceQtyInvalid(): boolean {
    const value = this.form.controls.advanceProductionQty.value;
    return value !== null && value < 0;
  }

  get hasValidTakenQty(): boolean {
    const value = this.form.controls.takenQty.value;
    return value !== null && value > 0;
  }

  get isValid(): boolean {
    return this.hasValidTakenQty && !this.isAdvanceQtyInvalid;
  }

  /**
   * Keeps Advance Qty as a read-through of the overage: enabled + auto-filled
   * only while Taken Qty exceeds what's remaining, disabled + cleared once it
   * drops back to (or below) the remaining qty.
   */
  private syncAdvanceQtyWithOverage(): void {
    const advanceControl = this.form.controls.advanceProductionQty;

    if (this.overageQty > 0) {
      if (advanceControl.disabled) {
        advanceControl.enable({ emitEvent: false });
      }
      advanceControl.setValue(this.overageQty, { emitEvent: false });
    } else {
      if (advanceControl.enabled) {
        advanceControl.disable({ emitEvent: false });
      }
      advanceControl.setValue(null, { emitEvent: false });
    }
  }

  private updateState(): void {
    if (!this.hasValidTakenQty) {
      if (this.form.controls.recipeVersionId.enabled) {
        this.form.controls.recipeVersionId.disable({ emitEvent: false });
        this.form.controls.priorityId.disable({ emitEvent: false });
        this.form.patchValue(
          { recipeVersionId: null, priorityId: null },
          { emitEvent: false },
        );
      }

      this.itemPlanningStateService.removeItem(this.line.Id);
      this.processStepStateService.removeStepsForLine(this.line.Id);
      return;
    }

    if (this.form.controls.recipeVersionId.disabled) {
      this.form.controls.recipeVersionId.enable({ emitEvent: false });
      this.form.controls.priorityId.enable({ emitEvent: false });
    }

    if (!this.isValid) {
      this.itemPlanningStateService.removeItem(this.line.Id);
      return;
    }

    const value = this.form.getRawValue();
    const item: IItemPlanningInput = {
      LineId: this.line.Id,
      TakenQty: value.takenQty,
      AdvanceProductionQty: value.advanceProductionQty,
      RecipeVersionId: value.recipeVersionId,
      PriorityId: value.priorityId,
      IsValid: this.isValid,
    };

    this.itemPlanningStateService.updateItem(item);
  }
}
