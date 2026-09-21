import { Component } from '@angular/core';
import { ThemeOptions } from '../../../../../theme-options';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Router, RouterModule } from '@angular/router';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
@Component({
  selector: 'app-user-box',
  templateUrl: './user-box.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule]
})
export class UserBoxComponent {
   Name!:string;
   Designation!:string;
   Enroll!:string;
   Email!:string

  ngOnint()
  {
      
  }
  
  constructor(public globals: ThemeOptions,private loginservice: LoginService,private router:Router) {
      this.Name=localStorage.getItem('Name');
      this.Designation=localStorage.getItem('Designation');
      this.Enroll=localStorage.getItem('Enroll');
      this.Email=localStorage.getItem('Email');
  }

  
 
  Logout()
  {
      this.loginservice.Logout().subscribe({next : () => {
          this.clearLocalData();
          this.router.navigate(['/pages/login-boxed']);
      },
      error:(error) =>{
            this.router.navigate(['/pages/login-boxed']);
            return false;
      }

      });
  }

  private clearLocalData(): void {
    sessionStorage.clear();
  }
}
