import { Component } from '@angular/core'

@Component({
    selector: 'app-problems',
    templateUrl: './problems.component.html',
    styleUrls: ['./problems.component.css']
})

export class ProblemsComponent {

    warnings: string[]
    errors: string[]

    ngOnInit() {
        this.errors = ['hi']
        this.warnings = []
    }

    validateModule() {

    }
}