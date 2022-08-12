import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import { LoginDialogData, LoginService } from '../login.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  email: string;
  password: string;

  working: boolean;
  badLogin: boolean;

  // forwardRef because of circular dependency
  constructor(@Inject(forwardRef(() => LoginService)) private loginService: LoginService, public dialogRef: MatDialogRef<LoginComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LoginDialogData) { }

  ngOnInit() {
    this.working = false;
  }

  finishCheck():boolean{
    return this.email != null && this.email.length > 0 && this.password != null && this.password.length > 0;
  }

  onLoginClick(){
    this.working = true;
    this.badLogin = false;
    this.loginService.login(this.email, this.password, this.data.server).subscribe(result => {
      this.loginService.users[this.data.server] = result;
      this.working = false;
      this.dialogRef.close(true);
    },
    err => {
      if(err.status === 401){
        this.working = false;
        this.badLogin = true;
      }
    });
  }

  onCancelClick(){
    // false signifies that they failed to login
    this.dialogRef.close(false);
  }

}
