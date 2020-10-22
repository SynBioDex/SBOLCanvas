import { CombinatorialInfo } from './combinatorialInfo';
import { GlyphInfo } from './glyphInfo';
import { IdentifiedInfo } from './identifiedInfo';

export class VariableComponentInfo {
    uri: string;
    variable: string;
    operator: string;
    variants: IdentifiedInfo[] = [];

    constructor(variable: string){
        this.variable = variable;
    }

    makeCopy(): VariableComponentInfo {
        const copy: VariableComponentInfo = new VariableComponentInfo(this.variable);
        copy.uri = this.uri;
        copy.operator = this.operator;
        for(let variant of this.variants){
            copy.variants.push(variant.makeCopy());
        }
        return copy;
    }

    addVariant(info: IdentifiedInfo){
        // avoid duplicates
        for(let variant of this.variants){
            if(variant.uri == info.uri)
                return;
        }
        this.variants.push(info);
    }
}