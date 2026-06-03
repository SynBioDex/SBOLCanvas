package org.sbolcanvas.utils;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.synbiohub.frontend.SynBioHubException;
import org.synbiohub.frontend.SynBioHubFrontend;
import org.synbiohub.frontend.WebOfRegistriesData;

/**
 * Known SynBioHub registry URLs. Lazy-fetched from the Web-of-Registries on
 * first {@link #all()} / {@link #known()} call, cached after; empty on failure.
 * Servlet uses {@link #all()}; converters use {@link #known()}.
 */
public final class SBOLRegistries {

	private static final Logger log = LogManager.getLogger(SBOLRegistries.class);

	private static volatile List<WebOfRegistriesData> cached;

	private SBOLRegistries() {}

	/** Full registry records. Lazy on first call, cached thereafter. */
	public static List<WebOfRegistriesData> all() {
		List<WebOfRegistriesData> r = cached;
		if (r == null) {
			synchronized (SBOLRegistries.class) {
				r = cached;
				if (r == null) {
					r = fetch();
					cached = r;
				}
			}
		}
		return r;
	}

	/** Instance URLs only -- derived view over {@link #all()} for prefix matching. */
	public static Set<String> known() {
		Set<String> result = new HashSet<>();
		for (WebOfRegistriesData reg : all()) {
			if (reg != null && reg.getInstanceUrl() != null && !reg.getInstanceUrl().isEmpty()) {
				result.add(reg.getInstanceUrl());
			}
		}
		return Collections.unmodifiableSet(result);
	}

	/** Test hook: pre-populates the cache so {@link #all()} skips the network. */
	static void presetForTests(List<WebOfRegistriesData> registries) {
		synchronized (SBOLRegistries.class) {
			cached = Collections.unmodifiableList(new java.util.ArrayList<>(registries));
		}
	}

	private static List<WebOfRegistriesData> fetch() {
		try {
			return Collections.unmodifiableList(SynBioHubFrontend.getRegistries());
		} catch (SynBioHubException e) {
			log.warn("Web-of-Registries unreachable; using empty registry list", e);
			return Collections.emptyList();
		}
	}
}
