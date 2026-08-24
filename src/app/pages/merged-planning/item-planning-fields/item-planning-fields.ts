import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';
import { IRecipe } from 'src/app/core/model/Common/Recipe/Recipe';
import { IMergedPlanningLine } from 'src/app/core/model/MergedPlanning/merged-planning-model';
import { IItemPlanningInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { ItemPlanningStateService } from 'src/app/core/services/MergedPlanning/item-planning-state-service';

@Component({
  selector: 'app-item-planning-fields',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './item-planning-fields.html',
  styleUrl: './item-planning-fields.scss',
})
export class ItemPlanningFields implements OnInit, OnChanges {
  @Input({ required: true }) line!: IMergedPlanningLine;
  @Input() priorities: IPriority[] = [];
  @Input() recipeVersions: IRecipe[] = [];

  form = new FormGroup({
    takenQty: new FormControl<number | null>(null),
    advanceProductionQty: new FormControl<number | null>(null),
    recipeVersionId: new FormControl<number | null>(null),
    priorityId: new FormControl<number | null>(null),
  });

  constructor(private itemPlanningStateService: ItemPlanningStateService) {}

  ngOnInit(): void {
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
  }

  get isTakenQtyInvalid(): boolean {
    const value = this.form.controls.takenQty.value;
    return value !== null && (value < 0 || value > this.line.Quantity);
  }

  get isAdvanceQtyInvalid(): boolean {
    const value = this.form.controls.advanceProductionQty.value;
    return value !== null && value < 0;
  }

  get isValid(): boolean {
    return !this.isTakenQtyInvalid && !this.isAdvanceQtyInvalid;
  }

  private updateState(): void {
    if (!this.isValid) return;
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
