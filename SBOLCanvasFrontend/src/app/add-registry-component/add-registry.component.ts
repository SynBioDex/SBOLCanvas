import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import {MatCardModule} from '@angular/material/card';
import { MatFormField } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { ConfirmComponent } from '../confirm/confirm.component';



@Component({
  selector: 'app-add-registry-component',
  standalone: true,
  imports: [MatCardModule, MatFormField, FormsModule, MatInputModule, MatButton],
  templateUrl: './add-registry.component.html',
  styleUrl: './add-registry.component.css'
})
export class AddRegistryComponent {
  registryURL: string
  registryPrefix: string
  isEditingPrefix: boolean = false
  registries: string[] = []
  registryPrefixes: any = {}

  constructor(public dialogRef: MatDialogRef<AddRegistryComponent>, public dialog: MatDialog, @Inject(MAT_DIALOG_DATA) public data: any) {
    if(data){
      this.registryURL = data.registry;
    }
    if(localStorage.getItem('registryPrefixes')){
      this.registryPrefixes = JSON.parse(localStorage.getItem('registryPrefixes'));
    }
  }

  onRegistryURLChange(url: string) {
    this.registryURL = url;
    if(!this.isEditingPrefix) {
      this.registryPrefix = url;
    }
  }

  async onEditPrefixClick() {
    const confirmRef = this.dialog.open(ConfirmComponent, { 
      data: { 
        message: "The Registry URL and Prefix should normally be the same value. These usually only differ when you are debugging using a local registry. Are you sure you want to edit the prefix?", 
        options: ["Yes", "No"] 
      } 
    });
    const result = await confirmRef.afterClosed().toPromise();
    if(result === "Yes"){
      this.isEditingPrefix = true;
    }
  }

  onCancelClick() {
    this.dialogRef.close(false);
  }

  onCreateClick() {
    if(!this.registryPrefix) {
      this.registryPrefix = this.registryURL;
    }

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

    this.registryPrefixes[this.registryURL] = this.registryPrefix;
    localStorage.setItem('registryPrefixes', JSON.stringify(this.registryPrefixes));
    
    this.dialogRef.close(true)
  }
}
