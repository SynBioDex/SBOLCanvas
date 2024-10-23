import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {MatCardModule} from '@angular/material/card';
import { MatFormField } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButton } from '@angular/material/button';



@Component({
  selector: 'app-add-registry-component',
  standalone: true,
  imports: [MatCardModule, MatFormField, FormsModule, MatInputModule, MatButton],
  templateUrl: './add-registry.component.html',
  styleUrl: './add-registry.component.css'
})
export class AddRegistryComponent {
  registryURL: string
  registries: string[] = []

  constructor(public dialogRef: MatDialogRef<AddRegistryComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    if(data){
      this.registryURL = data.registry;
    }
  }

  onCancelClick() {
    this.dialogRef.close(false);
  }

  onCreateClick() {
    if(localStorage.getItem('registries')){
      this.registries = JSON.parse(localStorage.getItem("registries"));
      if(!this.registries.includes(this.registryURL)){
        this.registries.push(this.registryURL)
      }
      localStorage.setItem('registries', JSON.stringify(this.registries))
    }
    else{
      this.registries.push(this.registryURL)
      localStorage.setItem("registries", JSON.stringify(this.registries))
    }
    this.dialogRef.close(true)
  }
}
