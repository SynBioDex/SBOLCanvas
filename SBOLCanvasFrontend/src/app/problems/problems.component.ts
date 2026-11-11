import { Component, OnDestroy, OnInit } from '@angular/core'
import { Subscription } from 'rxjs'
import { GraphService } from '../graph.service'
import type { Finding } from '../validation/rules'

interface ProblemGroup {
    viewId: string
    label: string
    errors: Finding[]
    warnings: Finding[]
}

@Component({
    selector: 'app-problems',
    templateUrl: './problems.component.html',
    styleUrls: ['./problems.component.css']
})

export class ProblemsComponent implements OnInit, OnDestroy {

    groups: ProblemGroup[] = []
    errorCount = 0
    warningCount = 0

    emptyView = false
    emptyViewLabel = 'Current view'
    tooltip = '0 errors, 0 warnings.'

    private subscription: Subscription | null = null

    constructor(private graphService: GraphService) { }

    ngOnInit() {
        this.subscription = this.graphService.designFindings$.subscribe(findings => this.showFindings(findings || []))
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe()
            this.subscription = null
        }
    }

    private showFindings(findings: Finding[]) {
        this.groups = this.groupByView(findings)
        this.updateEmptyView()
        this.errorCount = findings.filter(finding => finding.severity === 'error').length
        this.warningCount = findings.filter(finding => finding.severity === 'warning').length + (this.emptyView ? 1 : 0)
        this.tooltip = `${this.errorCount} error${this.errorCount == 1 ? '' : 's'}, ${this.warningCount} warning${this.warningCount == 1 ? '' : 's'}.`
            + (this.errorCount || this.warningCount ? ' Click to view more info.' : '')
    }

    private groupByView(findings: Finding[]): ProblemGroup[] {
        const groups: ProblemGroup[] = []
        const byView = new Map<string, ProblemGroup>()
        for (const finding of findings) {
            let group = byView.get(finding.location.viewId)
            if (!group) {
                group = { viewId: finding.location.viewId, label: this.viewLabel(finding.location.viewId), errors: [], warnings: [] }
                byView.set(finding.location.viewId, group)
                groups.push(group)
            }
            ;(finding.severity === 'error' ? group.errors : group.warnings).push(finding)
        }
        return groups
    }

    private viewLabel(viewId: string): string {
        const info = this.graphService.lookupInfo(viewId)
        return (info && info.getDisplayName()) || viewId
    }

    private updateEmptyView() {
        const current = this.graphService.getCurrentRoot()
        const children = (current && current.children) || []
        this.emptyView = children.length === 0
        const kind = current && current.isModuleView && current.isModuleView()
            ? 'Module'
            : current && current.isComponentView && current.isComponentView()
                ? 'Component'
                : 'Current view'
        this.emptyViewLabel = current ? `${kind} '${this.viewLabel(current.getId())}'` : kind
            }
        }
