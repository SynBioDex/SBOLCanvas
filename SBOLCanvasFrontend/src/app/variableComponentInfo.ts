import { GlyphInfo } from './glyphInfo';

export class VariableComponentInfo {
    uri: string;
    variable: string;
    operator: string;
    variants: GlyphInfo[] = [];

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

    addVariant(info: GlyphInfo){
        this.variants.push(info);
    }
}