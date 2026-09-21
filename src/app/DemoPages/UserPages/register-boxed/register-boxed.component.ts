import { Component } from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
@Component({
  selector: 'app-register-boxed',
  templateUrl: './register-boxed.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule],
  styles: []
})
export class RegisterBoxedComponent {

  constructor() { }

  onSubmit() {
    // Handle registration form submission
  }

  onTermsClick() {
    // Handle terms and conditions click
  }

}
