package org.sbolcanvas.utils;

import java.util.ArrayList;
import java.util.List;

import org.sbml.jsbml.ASTNode;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * Test helpers for asserting on JSBML AST structure.
 * Used instead of substring checks against ASTNode.toFormula().
 */
public final class ASTAssertions {

    /** Tolerance for real-number leaf comparisons. */
    private static final double NUMERIC_EPSILON = 1e-10;

    private ASTAssertions() {}

    public static boolean astReferencesSpecies(ASTNode node, String speciesId) {
        if (node == null) return false;
        if (node.isName() && speciesId.equals(node.getName())) {
            return true;
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            if (astReferencesSpecies(node.getChild(i), speciesId)) {
                return true;
            }
        }
        return false;
    }

    /** Asserts {@link #astEquals}, with rendered formula on both sides on failure. */
    public static void assertAstEquals(ASTNode expected, ASTNode actual, String message) {
        if (!astEquals(expected, actual)) {
            fail(message
                    + System.lineSeparator() + "  expected: " + safeFormula(expected)
                    + System.lineSeparator() + "  actual:   " + safeFormula(actual));
        }
    }

    /**
     * Returns a clone of {@code node} with SBOLCanvas's per-species parameter
     * names ({@code kr_<id>_f}, {@code nc_<id>_a}, etc.) collapsed to iBioSim's
     * global names ({@code kr_f}, {@code nc}, ...) so the AST can be compared
     * against an iBioSim reference export. Input AST is not mutated.
     *
     * TODO(#126): drop this helper when SBOLCanvas emits global parameter
     * names directly.
     */
    public static ASTNode rewriteParamNames(ASTNode node, String... speciesIds) {
        ASTNode copy = node.clone();
        renameInPlace(copy, speciesIds);
        return copy;
    }

    private static void renameInPlace(ASTNode node, String[] speciesIds) {
        if (node.isName()) {
            String name = node.getName();
            if (name != null) {
                for (String id : speciesIds) {
                    String renamed = globalize(name, id);
                    if (renamed != null) {
                        node.setName(renamed);
                        break;
                    }
                }
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            renameInPlace(node.getChild(i), speciesIds);
        }
    }

    private static String globalize(String name, String id) {
        if (name.equals("kr_" + id + "_f")) return "kr_f";
        if (name.equals("kr_" + id + "_r")) return "kr_r";
        if (name.equals("ka_" + id + "_f")) return "ka_f";
        if (name.equals("ka_" + id + "_r")) return "ka_r";
        if (name.equals("nc_" + id + "_a")) return "nc";
        if (name.equals("nc_" + id + "_r")) return "nc";
        return null;
    }

    /**
     * Strict node-for-node AST equality. PLUS/TIMES are flattened so left-leaning
     * infix {@code PLUS(PLUS(a,b),c)} matches multi-arity {@code PLUS(a,b,c)},
     * but operand order is preserved (commutative reorders fail). Numeric leaves
     * must agree on type and value (INTEGER vs REAL fails). POWER and
     * FUNCTION_POWER are treated as equivalent -- JSBML documents them as such,
     * and FormulaParserLL3's {@code ^} emits POWER while MathML's {@code <power/>}
     * emits FUNCTION_POWER.
     */
    public static boolean astEquals(ASTNode a, ASTNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;

        if (canonicalType(a) != canonicalType(b)) return false;

        if (a.isNumber()) {
            return numericLeavesEqual(a, b);
        }

        if (a.isName()) {
            String na = a.getName();
            String nb = b.getName();
            if (na == null) return nb == null;
            return na.equals(nb);
        }

        List<ASTNode> childrenA = canonicalChildren(a);
        List<ASTNode> childrenB = canonicalChildren(b);
        if (childrenA.size() != childrenB.size()) return false;
        for (int i = 0; i < childrenA.size(); i++) {
            if (!astEquals(childrenA.get(i), childrenB.get(i))) return false;
        }
        return true;
    }

    /**
     * Returns the comparison-canonical type, treating {@code POWER} and
     * {@code FUNCTION_POWER} as equivalent. See {@link #astEquals} for why.
     */
    private static ASTNode.Type canonicalType(ASTNode node) {
        ASTNode.Type t = node.getType();
        return (t == ASTNode.Type.POWER) ? ASTNode.Type.FUNCTION_POWER : t;
    }

    private static boolean numericLeavesEqual(ASTNode a, ASTNode b) {
        if (a.isInteger()) {
            return a.getInteger() == b.getInteger();
        }
        double va = a.getReal();
        double vb = b.getReal();
        if (Double.isNaN(va) || Double.isNaN(vb)) {
            return Double.isNaN(va) && Double.isNaN(vb);
        }
        return Math.abs(va - vb) < NUMERIC_EPSILON;
    }

    /**
     * Returns the children of {@code node}, with associative operators
     * ({@code PLUS}, {@code TIMES}) flattened. A child whose type matches the
     * parent has its own children spliced into the result.
     */
    private static List<ASTNode> canonicalChildren(ASTNode node) {
        List<ASTNode> out = new ArrayList<>();
        ASTNode.Type parentType = node.getType();
        boolean associative =
                parentType == ASTNode.Type.PLUS || parentType == ASTNode.Type.TIMES;
        for (int i = 0; i < node.getChildCount(); i++) {
            ASTNode child = node.getChild(i);
            if (associative && child.getType() == parentType) {
                out.addAll(canonicalChildren(child));
            } else {
                out.add(child);
            }
        }
        return out;
    }

    private static String safeFormula(ASTNode node) {
        if (node == null) return "<null>";
        try {
            return node.toFormula();
        } catch (Exception e) {
            return "<unrenderable: " + e.getMessage() + ">";
        }
    }
}
