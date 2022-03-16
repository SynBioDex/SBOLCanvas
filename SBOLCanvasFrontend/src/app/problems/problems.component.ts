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
        this.errors = ['Sequence contains illegal characters.','displayId cannot start with number.']
        this.warnings = ['Version syntax defies conventions.']
    }
}