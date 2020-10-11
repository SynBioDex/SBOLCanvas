import { variable } from '@angular/compiler/src/output/output_ast';
import { GlyphInfo } from './glyphInfo';
import { Info } from './info';
import { VariableComponentInfo } from './variableComponentInfo';

export class CombinatorialInfo extends Info{

    static counter: number = 0;

    templateURI: string;    
    version: string;
    variableComponents = [];
    strategy: string;
    name: string;
    description: string;

    constructor(){
        super();
        this.displayID = 'combinatorial' + (CombinatorialInfo.counter++);
    }

    addVariableComponentInfo(variableComponentInfo: VariableComponentInfo){
        this.variableComponents[variableComponentInfo.variable] = variableComponentInfo;
    }

    getVariableComponentInfo(variable: string): VariableComponentInfo {
        return this.variableComponents[variable];
    }

    setTemplateURI(templateURI: string){
        this.templateURI = templateURI;
    }

    getTemplateURI(): string {
        return this.templateURI;
    }

    makeCopy(): CombinatorialInfo {
        const copy: CombinatorialInfo = new CombinatorialInfo();
        copy.templateURI = this.templateURI;
        copy.displayID = this.displayID;
        copy.uriPrefix = this.uriPrefix;
        copy.strategy = this.strategy;
        copy.name = this.name;
        copy.description = this.description;
        for(let key in this.variableComponents){
            copy.variableComponents[key] = this.variableComponents[key].makeCopy();
        }
        return copy;
    }

    copyDataFrom(info: CombinatorialInfo) {
        this.templateURI = info.templateURI;
        this.displayID = info.displayID;
        this.uriPrefix = info.uriPrefix;
        this.strategy = info.strategy;
        this.name = info.name;
        this.description = info.description;
        this.variableComponents = [];
        for(let key in info.variableComponents){
            this.variableComponents[key] = info.variableComponents[key].makeCopy()
        }
    }

    encode(enc: any) {
        let node = enc.document.createElement('CombinatorialInfo');
        node.setAttribute("templateURI", this.templateURI);
    }

    getFullURI(): string {
        let fullURI = this.uriPrefix + '/' + this.displayID;
        if (this.version && this.version.length > 0) {
          fullURI += '/' + this.version;
        }
        return fullURI;
    }

}