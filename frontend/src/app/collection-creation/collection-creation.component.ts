import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FilesService } from '../files.service';
import { LoginService } from '../login.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatFormField } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {FormsModule} from '@angular/forms';
@Component({
  standalone:true,
  selector: 'app-collection-creation',
  templateUrl: './collection-creation.component.html',
  styleUrls: ['./collection-creation.component.css'],
  imports: [MatCardModule, MatFormFieldModule, MatDialogModule, MatCheckboxModule, FormsModule]
})
export class CollectionCreationComponent implements OnInit {

  working: boolean = false;

  registry: string = "Error";

  id: string;
  version: string;
  name: string;
  description: string;
  citations: string;
  overwrite: boolean = false;

  constructor(private filesService: FilesService, private loginService: LoginService, public dialogRef: MatDialogRef<CollectionCreationComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    if(data){
      this.registry = data.registry;
    }
  }

  ngOnInit() {

  }

  finishCheck(): boolean{
    return this.id && this.id.length > 0 && this.version && this.version.length > 0 && this.name && this.name.length > 0 && this.description && this.description.length > 0;
  }

  onCancelClick() {
    this.dialogRef.close(false);
  }

  onCreateClick() {
    this.working = true;
    this.filesService.createCollection(this.registry, this.loginService.users[this.registry], this.id, this.version, this.name, this.description, this.citations, this.overwrite).subscribe(_ => {
      this.dialogRef.close(true);
      this.working = false;
    });
  }

  inputChange(event: any){
    const id = event.target.id;

    switch (id){
      case "id":
        this.id = event.target.value;
        break;
      case "version":
        this.version = event.target.value;
        break;
      case "name":
        this.name = event.target.value;
        break;
      case "description":
        this.description = event.target.value;
        break;
      case "citations":
        this.citations = event.target.value;
        break;
    }
  }

}
