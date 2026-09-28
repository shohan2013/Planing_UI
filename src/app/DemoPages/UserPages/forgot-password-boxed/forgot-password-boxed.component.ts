import { Component } from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
@Component({
  selector: 'app-forgot-password-boxed',
  templateUrl: './forgot-password-boxed.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule],
  styles: []
})
export class ForgotPasswordBoxedComponent {

  constructor() { }

  onSubmit() {
    // Handle password recovery form submission
  }

}
