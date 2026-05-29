package org.sbolcanvas.utils;

import java.util.Collections;

import org.junit.platform.launcher.LauncherSession;
import org.junit.platform.launcher.LauncherSessionListener;

/**
 * Pre-empties the registry cache once at JUnit launcher startup so tests skip the
 * Web-of-Registries network fetch. Registered via
 * {@code META-INF/services/org.junit.platform.launcher.LauncherSessionListener}.
 */
public class TestEnvSetup implements LauncherSessionListener {

    @Override
    public void launcherSessionOpened(LauncherSession session) {
        SBOLRegistries.presetForTests(Collections.emptyList());
    }
}
