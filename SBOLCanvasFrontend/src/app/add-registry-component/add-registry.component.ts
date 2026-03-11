import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import {MatCardModule} from '@angular/material/card';
import { MatFormField } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmComponent } from '../confirm/confirm.component';

interface RegistryEntry {
  url: string;
  api: string;
  prefix: string;
}


@Component({
  selector: 'app-add-registry-component',
  standalone: true,
  imports: [MatCardModule, MatFormField, FormsModule, MatInputModule, MatButton, MatTooltipModule],
  templateUrl: './add-registry.component.html',
  styleUrl: './add-registry.component.css'
})
export class AddRegistryComponent {
  registryURL: string = ''
  registryAPI: string = ''
  registryPrefix: string = ''
  isEditingPrefix: boolean = false
  registries: Array<string | RegistryEntry> = []

  constructor(public dialogRef: MatDialogRef<AddRegistryComponent>, public dialog: MatDialog, @Inject(MAT_DIALOG_DATA) public data: any) {
    if(data && data.registry){
      const entry = this.toRegistryEntry(data.registry);
      this.registryURL = entry.url;
      this.registryAPI = entry.api;
      this.registryPrefix = entry.prefix;
    }
  }

  onRegistryURLChange() {
    if (!this.isEditingPrefix) {
      this.registryPrefix = this.registryURL;
    }
  }

  onRegistryAPIChange() {
  }

  async onEditPrefixClick() {
    const confirmRef = this.dialog.open(ConfirmComponent, { 
      data: { 
        message: "The Registry URL and Registry Prefix should normally be the same value. These usually only differ when you are debugging using a local registry. Are you sure you want to edit the prefix?", 
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
    if(!this.registryAPI) {
      this.registryAPI = this.registryURL;
    }

    if(!this.registryPrefix) {
      this.registryPrefix = this.registryURL;
    }

    if(localStorage.getItem('registries')){
      this.registries = JSON.parse(localStorage.getItem("registries"));
      const existingIndex = this.registries.findIndex((registry) => {
        const entry = this.toRegistryEntry(registry);
        return entry.url === this.registryURL;
      });

      const newEntry: RegistryEntry = {
        url: this.registryURL,
        api: this.registryAPI,
        prefix: this.registryPrefix
      };

      if(existingIndex >= 0){
        this.registries[existingIndex] = newEntry;
      } else {
        this.registries.push(newEntry)
      }
      localStorage.setItem('registries', JSON.stringify(this.registries))
    }
    else{
      this.registries.push({
        url: this.registryURL,
        api: this.registryAPI,
        prefix: this.registryPrefix
      })
      localStorage.setItem("registries", JSON.stringify(this.registries))
    }

    let registryPrefixes: any = {};
    if(localStorage.getItem('registryPrefixes')){
      registryPrefixes = JSON.parse(localStorage.getItem('registryPrefixes'));
    }
    registryPrefixes[this.registryURL] = this.registryPrefix;
    localStorage.setItem('registryPrefixes', JSON.stringify(registryPrefixes));
    
    this.dialogRef.close(true)
  }

  private toRegistryEntry(registry: string | RegistryEntry): RegistryEntry {
    if (typeof registry === 'string') {
      return {
        url: registry,
        api: registry,
        prefix: this.getLegacyPrefix(registry)
      };
    }

    return {
      url: registry.url,
      api: registry.api ? registry.api : registry.url,
      prefix: registry.prefix ? registry.prefix : registry.url
    };
  }

  private getLegacyPrefix(url: string): string {
    try {
      const serializedPrefixes = localStorage.getItem('registryPrefixes');
      if (!serializedPrefixes) {
        return url;
      }
      const registryPrefixes = JSON.parse(serializedPrefixes);
      return registryPrefixes[url] ? registryPrefixes[url] : url;
    } catch {
      return url;
    }
  }
}
