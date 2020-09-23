import { GlyphInfo } from './glyphInfo';

export class VariableComponentInfo {
    uri: string;
    variable: string;
    operator: string;
    variants: GlyphInfo[] = [];

    constructor(variable: string){
        this.variable = variable;
    }

    addVariant(info: GlyphInfo){
        this.variants.push(info);
    }
}