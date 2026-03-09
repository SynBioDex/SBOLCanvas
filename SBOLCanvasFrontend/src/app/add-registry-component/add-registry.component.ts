import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import {MatCardModule} from '@angular/material/card';
import { MatFormField } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmComponent } from '../confirm/confirm.component';


@Component({
  selector: 'app-add-registry-component',
  standalone: true,
  imports: [MatCardModule, MatFormField, FormsModule, MatInputModule, MatButton, MatTooltipModule],
  templateUrl: './add-registry.component.html',
  styleUrl: './add-registry.component.css'
})
export class AddRegistryComponent {
  registryURL: string = ''
  registryName: string = ''
  registryPrefix: string = ''
  isEditingPrefix: boolean = false
  registries: string[] = []

  constructor(public dialogRef: MatDialogRef<AddRegistryComponent>, public dialog: MatDialog, @Inject(MAT_DIALOG_DATA) public data: any) {
    if(data && data.registry){
      this.registryURL = data.registry;
      
      if(localStorage.getItem('registryNames')){
        const names = JSON.parse(localStorage.getItem('registryNames'));
        this.registryName = names[this.registryURL] || '';
      }
      
      if(localStorage.getItem('registryPrefixes')){
        const prefixes = JSON.parse(localStorage.getItem('registryPrefixes'));
        this.registryPrefix = prefixes[this.registryURL] || this.registryURL;
      }
    }
  }

  onRegistryURLChange() {
    
    if (!this.registryPrefix) {
      this.registryPrefix = this.registryURL;
    }
  }

  async onEditPrefixClick() {
    const confirmRef = this.dialog.open(ConfirmComponent, { 
      data: { 
        message: "The Registry URL and URI Prefix should normally be the same value. These usually only differ when you are debugging using a local registry. Are you sure you want to edit the prefix?", 
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

    
    if(this.registryName && this.registryName.length > 0) {
      let registryNames: any = {};
      if(localStorage.getItem('registryNames')){
        registryNames = JSON.parse(localStorage.getItem('registryNames'));
      }
      registryNames[this.registryURL] = this.registryName;
      localStorage.setItem('registryNames', JSON.stringify(registryNames));
    }

    
    let registryPrefixes: any = {};
    if(localStorage.getItem('registryPrefixes')){
      registryPrefixes = JSON.parse(localStorage.getItem('registryPrefixes'));
    }
    registryPrefixes[this.registryURL] = this.registryPrefix;
    localStorage.setItem('registryPrefixes', JSON.stringify(registryPrefixes));
    
    this.dialogRef.close(true)
  }
}
