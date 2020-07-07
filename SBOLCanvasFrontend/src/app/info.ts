

/**
 * Base class for GlyphInfo InteractionInfo and ModuleInfo
 */
export abstract class Info{

    abstract makeCopy(): Info;
    abstract copyDataFrom(info: Info);
    abstract encode(enc: any);
    abstract getFullURI(): string;

}