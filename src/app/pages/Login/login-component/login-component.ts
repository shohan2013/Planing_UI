import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';
import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from '../../../core/services/login/login.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-login-component',
  standalone:true,
  imports: [ReactiveFormsModule,CommonModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent implements OnDestroy {
constructor(public loginservice:LoginService,private router:Router,private toastr: ToastrService){}
  year: number = new Date().getFullYear();
  submitted = false;
  loading=false;
  fieldTextType!: boolean;
  showPassword = false;
  private destroy$ = new Subject<void>();


  loginForm:FormGroup=new FormGroup({
    UserName:new FormControl('',[Validators.required]),
    Password:new FormControl('',Validators.required)
  });

   get f(): { [key: string]: AbstractControl } {
    return this.loginForm.controls;
  }
  
  onSubmit()
  {
    this.loginservice.Login(this.loginForm.value).pipe(takeUntil(this.destroy$)).subscribe({ next : (data) => {
      this.toastr.success('success');
    },
    error:(error) => {
      console.log('Error :',error);
    }
      
    });
  }

    toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
