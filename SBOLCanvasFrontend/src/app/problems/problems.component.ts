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
        this.validateBackbones(warnings)
        this.validateInteractionsAndEvents(warnings)
        // more here...

        // Transpose to separate errors and warnings
        this.warnings = warnings
        this.errors = errors
    }

    validateCurrentView(warnings: string[], errors: string[]) {
        const currentView = this.graphService.getCurrentRoot()
        const children = currentView.children || []

        // Warning: No children in current view
        if (!children.length) {
            const cellType = currentView.isModuleView() ? 'Module' : currentView.isComponentView() ? 'Component' : 'Current view'
            warnings.push(`${cellType} does not contain any children.`)
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
        if (!info) return
        const sequence = (info.sequence || '').toUpperCase()
        const version = (info.version || '')

        // Error: No ID
        !info.displayID && errors.push(`${info.partRole} is missing an ID.`)

        // Error: Non-IUPAC compliant sequence
        const negativeIUPACSequenceRegex = /[^ACGTURYSWKMBDHVN\.\-]/g
        var compliant = !sequence.match(negativeIUPACSequenceRegex)
        const sequencePreview = sequence.substring(0, 10)
        !compliant && errors.push(`Component '${info.displayID}' has illegal sequence: ${sequencePreview}...`)

        // Warning: No sequence
        !sequence && warnings.push(`Component '${info.displayID}' does not have a sequence.`)

        // Warning: No version
        !version && warnings.push(`Component '${info.displayID}' does not have a version.`)

        // Warning: Non-Semver compliant version
        // Got Regex from https://ihateregex.io/expr/semver/#
        // const semverVersionRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/gm

        // using less strict expression now -- SBOL interpreted Semver improperly and actually intended
        // to allow versions like 1 or 1.3
        const versionRegex = /^[0-9]+[\\p{L}0-9_\\.-]*$/
        compliant = !!version.match(versionRegex)
        version && !compliant &&
            warnings.push(`Component '${info.displayID}' has incompliant version: ${version}`)
    }

    validateBackbones(warnings: string[]) {
        const currentView = this.graphService.getCurrentRoot()
        const containers = (currentView.children || []).filter(c => c.isCircuitContainer())

        for (const container of containers) {
            const children = container.children || []
            const glyphs = children.filter(c => c.isSequenceFeatureGlyph && c.isSequenceFeatureGlyph())

            if (glyphs.length > 0 && !glyphs.some(g => {
                const info = this.graphService.lookupInfo(g.value)
                return info && info.partRole && info.partRole.includes('Promoter')
            })) {
                const containerInfo = this.graphService.lookupInfo(container.value)
                const name = (containerInfo && containerInfo.displayID) || 'unnamed'
                warnings.push(`Backbone '${name}' has no promoter. Add a Promoter for SBML export.`)
            }
        }
    }

    validateInteractionsAndEvents(warnings: string[]) {
        const currentView = this.graphService.getCurrentRoot()
        const directChildren = currentView.children || []
        const nestedChildren = directChildren.map(c => c.children || []).flat()
        const allCells = [...directChildren, ...nestedChildren]

        // Disconnected interaction edges
        const interactions = allCells.filter(c => c.isInteraction && c.isInteraction())
        const regulationByTarget: { [key: string]: { inhibition: boolean, stimulation: boolean } } = {}

        for (const edge of interactions) {
            const info = this.graphService.getFromInteractionDict(edge.value)
            if (!info) continue

            const type = info.interactionType
            const isDegradation = type === 'Degradation'

            // Degradation edges naturally have no target (species degrades into nothing)
            if (!edge.source || (!edge.target && !isDegradation)) {
                warnings.push('Disconnected interaction edge found.')
                continue
            }
            if (type === 'Inhibition' || type === 'Stimulation') {
                const targetId = edge.target.value || 'unknown'
                if (!regulationByTarget[targetId])
                    regulationByTarget[targetId] = { inhibition: false, stimulation: false }
                if (type === 'Inhibition') regulationByTarget[targetId].inhibition = true
                if (type === 'Stimulation') regulationByTarget[targetId].stimulation = true
            }
        }

        for (const [targetId, reg] of Object.entries(regulationByTarget)) {
            if (reg.inhibition && reg.stimulation) {
                const info = this.graphService.lookupInfo(targetId)
                const name = (info && info.name) || (info && info.displayID) || 'unknown'
                warnings.push(`Mixed regulation on promoter '${name}' - not supported for SBML export.`)
            }
        }

        // Complex formation nodes
        const interactionNodes = allCells.filter(c => c.isInteractionNode && c.isInteractionNode())
        for (const node of interactionNodes) {
            const info = this.graphService.getFromInteractionDict(node.value)
            if (!info) continue
            const type = info.interactionType
            if (type !== 'Biochemical Reaction' && type !== 'Non-Covalent Binding') continue

            const edges = this.graphService.graph.getModel().getEdges(node) || []
            const outgoing = edges.filter(e => e.source === node)
            if (outgoing.length === 0 || !outgoing[0].target)
                warnings.push('Complex formation node is missing a product connection.')

            for (const inEdge of edges.filter(e => e.target === node)) {
                if (!inEdge.source)
                    warnings.push('Complex formation has a disconnected reactant edge.')
            }
        }

        // Events without target species
        const events = allCells.filter(c => c.isEvent && c.isEvent())
        for (const event of events) {
            const eventInfo = this.graphService.getFromEventDict(event.value)
            if (!eventInfo) continue
            const targetSpecies = (eventInfo.simulationData || {})['targetSpecies']
            if (!targetSpecies)
                warnings.push(`Event '${eventInfo.displayID || 'unnamed'}' has no target species.`)
        }
    }
}
