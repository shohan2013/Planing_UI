import { Component, Input, OnDestroy } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../../core/services/login/login.service';
import { Subject, takeUntil } from 'rxjs';
import { faL } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-login-boxed',
  templateUrl: './login-boxed.component.html',
  standalone: false,
  styles: []
})


export class LoginBoxedComponent implements OnDestroy{

  constructor(public loginservice:LoginService,private toastr: ToastrService,private router:Router){}
  year: number = new Date().getFullYear();
  submitted = false;
  loading=false;
  fieldTextType!: boolean;
  showPassword = false
  isLoading = false;
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

    
    this.isLoading=true;
    //this.submitted=true;
    if(this.loginForm.valid)
    {
              this.loginservice.Login(this.loginForm.value).pipe(takeUntil(this.destroy$)).subscribe({ next : (data) => {
                if(data)
                {
                    localStorage.setItem('Name', data.query.Name);
                    localStorage.setItem('Designation', data.query.DesignationName);
                    localStorage.setItem('Enroll', data.query.Enroll);
                    localStorage.setItem('Email', data.query.Email);
                    this.router.navigate(['/dashboards/analytics']);
                    this.isLoading = false;
                }
                else
                {
                    this.toastr.error('Invalid username or password.');
                    this.isLoading=false;
                }
              
            },
            error:(error) => {
              this.isLoading = false;
            }
            });
    }
  }
    
    toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
