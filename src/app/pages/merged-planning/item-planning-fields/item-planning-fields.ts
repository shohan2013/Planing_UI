import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';
import { IRecipe } from 'src/app/core/model/Common/Recipe/Recipe';
import {
  IItemPlanningInput,
  IMergedPlanningLine,
} from 'src/app/core/model/MergedPlanning/merged-planning-model';

@Component({
  selector: 'app-item-planning-fields',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './item-planning-fields.html',
  styleUrl: './item-planning-fields.scss',
})
export class ItemPlanningFields implements OnChanges {
  @Input({ required: true }) line!: IMergedPlanningLine;
  @Input() priorities: IPriority[] = [];
  @Input() recipeVersions: IRecipe[] = [];
  @Output() valueChange = new EventEmitter<IItemPlanningInput>();

  takenQty: number | null = null;
  advanceProductionQty: number | null = null;
  recipeVersionId: number | null = null;
  priorityId: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['line'] || !this.line) return;

    this.takenQty = this.line.TakenQty ?? null;
    this.advanceProductionQty = this.line.AdvanceProductionQty ?? null;
    this.recipeVersionId = this.line.RecipeVersionId ?? null;
    this.priorityId = this.line.PriorityId ?? null;
  }

  get isTakenQtyInvalid(): boolean {
    return (
      this.takenQty !== null &&
      (this.takenQty < 0 || this.takenQty > this.line.Quantity)
    );
  }

  get isAdvanceQtyInvalid(): boolean {
    return this.advanceProductionQty !== null && this.advanceProductionQty < 0;
  }

  get isValid(): boolean {
    return !this.isTakenQtyInvalid && !this.isAdvanceQtyInvalid;
  }

  onValueChange(): void {
    this.valueChange.emit({
      LineId: this.line.Id,
      TakenQty: this.takenQty,
      AdvanceProductionQty: this.advanceProductionQty,
      RecipeVersionId: this.recipeVersionId,
      PriorityId: this.priorityId,
      IsValid: this.isValid,
    });
  }
}
