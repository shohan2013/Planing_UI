import { Component, Input, Output } from '@angular/core';
import { ThemeOptions } from '../../../../../theme-options';
import { LoginService } from 'src/app/core/services/login/login.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-box',
  templateUrl: './user-box.component.html',
  standalone: false,
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
