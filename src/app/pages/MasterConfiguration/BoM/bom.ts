import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';

@Component({
  selector: 'app-bom',
  templateUrl: './bom.html',
  styleUrl: './bom.scss',
  imports: [CommonModule,FormsModule,ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bom {

    formGroup: FormGroup = new FormGroup({
    Name: new FormControl('', Validators.required),
    ModuleID: new FormControl('', Validators.required),
    Code: new FormControl('', Validators.required),
    Sequence: new FormControl('', Validators.required),
    IsActive: new FormControl(true, { nonNullable: true }),
  });
  
  addRawMaterial()
  {

  }

  addResource()
  {

  }

  onSubmit()
  {

  }
}
