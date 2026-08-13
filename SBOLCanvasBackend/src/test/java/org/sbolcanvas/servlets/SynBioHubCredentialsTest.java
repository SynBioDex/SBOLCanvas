package org.sbolcanvas.servlets;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** Splitting of the "email:password" Authorization header value into its two parts. */
@DisplayName("SynBioHub Authorization credential parsing")
class SynBioHubCredentialsTest {

    @Test
    @DisplayName("email and password are split at the separator")
    void splitsEmailFromPassword() {
        String[] credentials = SynBioHub.parseCredentials("user@example.com:secret");

        assertArrayEquals(new String[] { "user@example.com", "secret" }, credentials);
    }

    @Test
    @DisplayName("special characters in the password are preserved")
    void preservesSpecialCharactersInPassword() {
        String password = "p@ss:w0rd!#$%^&*()_+-=[]{}|;'\",.<>/?~";

        String[] credentials = SynBioHub.parseCredentials("user@example.com:" + password);

        assertArrayEquals(new String[] { "user@example.com", password }, credentials);
    }

    @Test
    @DisplayName("a trailing separator yields an empty password")
    void allowsEmptyPassword() {
        String[] credentials = SynBioHub.parseCredentials("user@example.com:");

        assertArrayEquals(new String[] { "user@example.com", "" }, credentials);
    }

    @Test
    @DisplayName("a header with no separator is left alone as a user token")
    void returnsNullForTokenHeader() {
        assertNull(SynBioHub.parseCredentials("token-abc"));
    }

    @Test
    @DisplayName("a missing header returns null")
    void returnsNullForMissingHeader() {
        assertNull(SynBioHub.parseCredentials(null));
    }
}
