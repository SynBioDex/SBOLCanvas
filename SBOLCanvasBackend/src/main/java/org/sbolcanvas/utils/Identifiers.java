package org.sbolcanvas.utils;

import java.util.Set;

/**
 * The one home for turning arbitrary strings into format-safe identifiers.
 * Two target formats, deliberately different rule sets:
 * - {@link #toSId} for SBML SIds (letters, digits, underscores; uniqueness via a caller-owned used set)
 * - {@link #toNCName}/{@link #fromNCName} for XML NCNames (illegal characters escape as _xHHHH_)
 */
public final class Identifiers {

	private Identifiers() {
	}

	/**
	 * Sanitizes a string to be a valid SBML SId. IDs produced by this method (species,
	 * reaction, event, and other model-entity ids) must:
	 * - be unique (tracked in the caller-owned usedIds set)
	 * - start with a letter or underscore
	 * - contain only letters, digits, and underscores
	 * - never contain "__" (iBioSim parses "__" as its internal submodel separator)
	 * Layout glyph ids are built separately and intentionally use the "Glyph__" prefix.
	 *
	 * @param raw The raw ID string
	 * @param usedIds IDs already taken; the new id is added to it
	 * @return A valid, unique SBML SId
	 */
	public static String toSId(String raw, Set<String> usedIds) {
		String id = raw;
		if (id == null || id.isEmpty()) {
			id = "unnamed";
		}
		// Runs of invalid characters collapse to one underscore; trailing underscores are
		// trimmed so the dedup suffix below cannot reintroduce a double underscore
		String sanitized = id.replaceAll("[^a-zA-Z0-9_]+", "_").replaceAll("_+", "_").replaceAll("_+$", "");
		if (sanitized.isEmpty()) {
			sanitized = "unnamed";
		}
		// SIds must not start with a digit
		if (Character.isDigit(sanitized.charAt(0))) {
			sanitized = "_" + sanitized;
		}
		if (usedIds.contains(sanitized)) {
			int suffix = 2;
			while (usedIds.contains(sanitized + "_" + suffix)) {
				suffix++;
			}
			sanitized = sanitized + "_" + suffix;
		}
		usedIds.add(sanitized);
		return sanitized;
	}

	/**
	 * Sanitize a string to be a valid XML NCName for use as a QName local part.
	 * Characters not valid in NCNames are encoded as _xHHHH_ where HHHH is 4-digit uppercase hex.
	 * Needed because simulationData keys can contain full URIs
	 * (e.g., "nc_https://sbolcanvas.org/FKha2kkU/1") which are invalid XML element names.
	 */
	public static String toNCName(String key) {
		if (key == null || key.isEmpty())
			return key;
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < key.length(); i++) {
			char c = key.charAt(i);
			if (i == 0 ? (Character.isLetter(c) || c == '_')
					: (Character.isLetterOrDigit(c) || c == '.' || c == '-' || c == '_')) {
				sb.append(c);
			} else {
				sb.append("_x").append(String.format("%04X", (int) c)).append("_");
			}
		}
		return sb.toString();
	}

	/**
	 * Reverse {@link #toNCName}: decode _xHHHH_ sequences back to characters.
	 */
	public static String fromNCName(String key) {
		if (key == null || key.isEmpty())
			return key;
		StringBuilder sb = new StringBuilder();
		int i = 0;
		while (i < key.length()) {
			if (i + 6 < key.length() && key.charAt(i) == '_' && key.charAt(i + 1) == 'x'
					&& isHexDigit(key.charAt(i + 2)) && isHexDigit(key.charAt(i + 3))
					&& isHexDigit(key.charAt(i + 4)) && isHexDigit(key.charAt(i + 5))
					&& key.charAt(i + 6) == '_') {
				sb.append((char) Integer.parseInt(key.substring(i + 2, i + 6), 16));
				i += 7;
			} else {
				sb.append(key.charAt(i));
				i++;
			}
		}
		return sb.toString();
	}

	private static boolean isHexDigit(char c) {
		return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f');
	}
}
