import { Component } from '@angular/core'
import { GraphService } from '../graph.service'


@Component({
    selector: 'app-problems',
    templateUrl: './problems.component.html',
    styleUrls: ['./problems.component.css']
})

export class ProblemsComponent {

    warnings: string[]
    errors: string[]

    constructor(private graphService: GraphService) { }

    ngOnInit() {
        this.warnings = []
        this.errors = []

        setInterval(this.validate.bind(this), 750)
    }

    validate() {
        const warnings = []
        const errors = []

        // Validation functions
        this.validateCurrentView(warnings, errors)
        this.validateComponents(warnings, errors)
        // more here...

        // Transpose to separate errors and warnings
        this.warnings = warnings
        this.errors = errors
    }

    validateCurrentView(warnings: string[], errors: string[]) {

        const currentView = this.graphService.getCurrentRoot()
        const children = currentView.children || []

        // Warning: No children in current view
        if(!children.length) {
            const cellType = currentView.isModuleView() ? 'Module' : currentView.isComponentView() ? 'Component' : 'Current view'
            warnings.push(`${cellType} doesn't contain any children.`)
        }

        // TO DO: other validations
    }

    validateComponents(warnings: string[], errors: string[]) {
        const currentView = this.graphService.getCurrentRoot()
        const circuitContainers = currentView.children || []
        const components = circuitContainers
            .map(container => container.children || [])
            .flat()
            .filter(comp => comp.value)

        components.forEach(comp => this.validateComponent(comp, warnings, errors))
    }

    validateComponent(component, warnings: string[], errors: string[]) {
        const info = this.graphService.lookupInfo(component.value)
        const sequence = (info.sequence || '').toUpperCase()

        // Warning: No sequence
        !sequence && warnings.push(`Component '${info.displayID}' doesn't have a sequence.`)

        // Error: Non-IUPAC compliant sequence
        const incompliantRegex = /[^ACGTURYSWKMBDHVN\.\-]/g
        const compliant = !sequence.match(incompliantRegex)
        const sequencePreview = sequence.substring(0, 10)
        !compliant && errors.push(`Component '${info.displayID}' has illegal sequence: ${sequencePreview}...`)
    }    
}
