import { Component, Inject, OnInit } from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import { LoginDialogData } from '../toolbar/toolbar.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  servers:string[];

  constructor(public dialogRef: MatDialogRef<LoginComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LoginDialogData) { }

  ngOnInit() {
  }

  finishCheck():boolean{
    return this.data.email != null && this.data.password != null && this.data.server != null;
  }

  onCancelClick(){
    this.dialogRef.close();
  }

}
