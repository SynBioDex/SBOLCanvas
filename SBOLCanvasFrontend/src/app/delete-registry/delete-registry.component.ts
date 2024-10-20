import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {MatCardModule} from '@angular/material/card';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';



@Component({
  selector: 'app-delete-registry',
  standalone: true,
  imports: [MatCardModule, MatInputModule, MatSelectModule, MatFormFieldModule, MatButton],
  templateUrl: './delete-registry.component.html',
  styleUrl: './delete-registry.component.css'
})
export class DeleteRegistryComponent {
  registries: string[] = JSON.parse(localStorage.getItem("registries"))
  deletedRegistries: string[] = []
  constructor(public dialogRef: MatDialogRef<DeleteRegistryComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit(){
    this.registries = JSON.parse(localStorage.getItem("registries"))
  }
  onCancelClick() {
    this.dialogRef.close(false);
  }

  onDeleteClick() {
    const registries = JSON.parse(localStorage.getItem("registries"))
    const newRegistries = registries.filter(registry => !this.deletedRegistries.includes(registry))
    
    localStorage.setItem('registries', JSON.stringify(newRegistries))
    this.dialogRef.close(true)
  }

}
