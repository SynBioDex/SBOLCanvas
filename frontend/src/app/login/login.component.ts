import { Component, Inject, OnInit, forwardRef } from '@angular/core';

import { LoginDialogData, LoginService } from '../login.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import {FormsModule} from '@angular/forms'
@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports : [MatFormFieldModule, MatCardModule, MatInputModule,FormsModule]
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
      this.loginService.users[this.data.server] = JSON.parse(result);
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
