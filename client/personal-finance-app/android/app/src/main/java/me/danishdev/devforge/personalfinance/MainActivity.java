package me.danishdev.devforge.personalfinance;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/**
 * MainActivity — extends Capacitor's BridgeActivity.
 *
 * Hardware back button behaviour:
 *   - If the WebView has history to go back to → navigate back inside the app.
 *   - If there is no history (user is on the root page) → finish the activity
 *     (i.e. close the app), which is the standard Android behaviour.
 *
 * This replaces the old onBackPressed() override which is deprecated in
 * API 33+.  We register an OnBackPressedCallback instead so it integrates
 * correctly with the AndroidX predictive-back gesture on Android 13/14.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerBackHandler();
    }

    private void registerBackHandler() {
        // enabled = true → we always want to intercept first to check history
        OnBackPressedCallback callback = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView != null && webView.canGoBack()) {
                    // The WebView still has history → go back in-app
                    webView.goBack();
                } else {
                    // No more history → disable ourselves so the system
                    // default handler can finish the activity cleanly
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        };

        getOnBackPressedDispatcher().addCallback(this, callback);
    }
}
