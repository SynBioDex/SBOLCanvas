import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {MatCardModule} from '@angular/material/card';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { LoginService, RegistryEntry } from '../login.service';


@Component({
  selector: 'app-delete-registry',
  standalone: true,
  imports: [MatCardModule, MatInputModule, MatSelectModule, MatFormFieldModule, MatButton],
  templateUrl: './delete-registry.component.html',
  styleUrl: './delete-registry.component.css'
})
export class DeleteRegistryComponent {
  registries: Array<string | RegistryEntry> = []
  deletedRegistries: string[] = []
  
  constructor(public dialogRef: MatDialogRef<DeleteRegistryComponent>, @Inject(MAT_DIALOG_DATA) public data: any, public loginService: LoginService) {}

  ngOnInit(){
    const stored = localStorage.getItem("registries");
    if (stored) {
      this.registries = JSON.parse(stored);
    }
  }
  
  onCancelClick() {
    this.dialogRef.close(false);
  }

  onDeleteClick() {
    const registries = JSON.parse(localStorage.getItem("registries"))
    const newRegistries = registries.filter((registry: string | RegistryEntry) => {
      const url = this.loginService.getRegistryDisplayURL(registry);
      return !this.deletedRegistries.includes(url);
    })
    
    localStorage.setItem('registries', JSON.stringify(newRegistries))
    this.dialogRef.close(true)
  }

  getRegistryURL(registry: string | RegistryEntry): string {
    return this.loginService.getRegistryDisplayURL(registry);
  }

}
