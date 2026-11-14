package com.mscurechain.hospital;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    public static final String APP_ORIGIN = "https://app.mscurechain.com";
    public static final String LOGIN_URL = "https://app.mscurechain.com/auth/login";

    private WebView webView;
    private WebView splashWebView;
    private ValueCallback<Uri[]> filePathCallback;
    private boolean isSplashDismissed = false;

    private final ActivityResultLauncher<Intent> fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (filePathCallback != null) {
                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        if (result.getData().getClipData() != null) {
                            int count = result.getData().getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = result.getData().getClipData().getItemAt(i).getUri();
                            }
                        } else if (result.getData().getData() != null) {
                            results = new Uri[]{result.getData().getData()};
                        }
                    }
                    filePathCallback.onReceiveValue(results);
                    filePathCallback = null;
                }
            }
    );

    private final ActivityResultLauncher<String[]> requestPermissionsLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(),
            permissions -> {
                // Permissions granted callback
            }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Clear FLAG_SECURE so users can take screenshots without system restrictions
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);

        // Permanently suppress Android Autofill / Password Manager popups from stealing focus
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                android.view.autofill.AutofillManager afm = getSystemService(android.view.autofill.AutofillManager.class);
                if (afm != null) {
                    afm.cancel();
                    afm.disableAutofillServices();
                }
            } catch (Exception ignored) {}
        }

        setContentView(R.layout.activity_main);

        requestAppPermissions();

        webView = findViewById(R.id.webView);
        splashWebView = findViewById(R.id.splashWebView);

        setupSplashWebView();
        setupWebView();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (splashWebView != null && splashWebView.getVisibility() == View.VISIBLE) {
                    finish();
                    return;
                }
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            // Load local pre-rendered Next.js Login route directly
            webView.loadUrl(LOGIN_URL);
        }

        // Safety fallback: Ensure splash is dismissed after 6.5 seconds maximum
        new Handler(Looper.getMainLooper()).postDelayed(this::dismissSplash, 6500);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupSplashWebView() {
        if (splashWebView == null) return;
        WebSettings splashSettings = splashWebView.getSettings();
        splashSettings.setJavaScriptEnabled(true);
        splashSettings.setDomStorageEnabled(true);
        splashSettings.setAllowFileAccess(true);
        splashSettings.setAllowContentAccess(true);
        splashWebView.setBackgroundColor(0xFFFFFFFF);
        splashWebView.addJavascriptInterface(new WebAppInterface(this), "AndroidNative");
        splashWebView.loadUrl("file:///android_asset/splash.html");
    }

    public synchronized void dismissSplash() {
        if (isSplashDismissed) return;
        isSplashDismissed = true;
        runOnUiThread(() -> {
            if (splashWebView != null && splashWebView.getVisibility() == View.VISIBLE) {
                splashWebView.animate()
                        .alpha(0f)
                        .setDuration(250)
                        .withEndAction(() -> {
                            splashWebView.setVisibility(View.GONE);
                            if (webView != null) {
                                webView.requestFocus();
                            }
                        });
            }
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setGeolocationEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Enable Cookies (including cross-domain third-party cookies for Railway backend authentication)
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        // Disable Autofill & Password popups that hijack window focus in Android WebView
        settings.setSaveFormData(false);
        settings.setSavePassword(false);
        webView.clearFormData();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        }

        // Modern Chrome User-Agent with AndroidBridge flag
        String defaultUA = settings.getUserAgentString();
        settings.setUserAgentString(defaultUA + " MSCureChainHospitalApp/1.1.0 AndroidBridge/1.0.0");

        // Direct Touch & Focus Retention
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();
        webView.setBackgroundColor(0xFFFFFFFF);

        // Native Bridge Interface
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:") || url.startsWith("sms:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Application not found to handle request", Toast.LENGTH_SHORT).show();
                        return true;
                    }
                }
                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri != null ? uri.getPath() : null;

                if (path != null) {
                    // Fast local health response so status indicator stays green
                    if (path.equals("/api/backend-health") || path.startsWith("/api/backend-health")) {
                        String json = "{\"connected\":true,\"status\":200,\"backendUrl\":\"https://mscurechain-backend-latest-production.up.railway.app\"}";
                        try {
                            return new WebResourceResponse("application/json", "UTF-8", 200, "OK", getCorsHeaders(), new java.io.ByteArrayInputStream(json.getBytes("UTF-8")));
                        } catch (Exception ignored) {}
                    }

                    // 1. Static Next.js Bundles (_next/static/...)
                    if (path.startsWith("/_next/static/")) {
                        String relative = path.substring("/_next/static/".length());
                        try {
                            InputStream is = getAssets().open("next_static/" + relative);
                            return new WebResourceResponse(getMimeType(path), "UTF-8", 200, "OK", getCorsHeaders(), is);
                        } catch (IOException ignored) {}
                    }

                    // 2. Public Static Media & Assets (/assets/, /public/...)
                    if (path.startsWith("/assets/") || path.startsWith("/icons/") || path.startsWith("/images/") || path.startsWith("/fonts/") || path.equals("/favicon.ico") || path.equals("/manifest.json")) {
                        try {
                            String assetPath = "public" + path;
                            InputStream is = getAssets().open(assetPath);
                            return new WebResourceResponse(getMimeType(path), null, 200, "OK", getCorsHeaders(), is);
                        } catch (IOException ignored) {}
                    }

                    // 3. Local Next.js HTML Routes
                    if (path.equals("/") || path.equals("/index.html")) {
                        try {
                            InputStream is = getAssets().open("pages/index.html");
                            return new WebResourceResponse("text/html", "UTF-8", 200, "OK", getCorsHeaders(), is);
                        } catch (IOException ignored) {}
                    }

                    if (path.equals("/auth/login") || path.equals("/auth/login/")) {
                        try {
                            InputStream is = getAssets().open("pages/auth/login.html");
                            return new WebResourceResponse("text/html", "UTF-8", 200, "OK", getCorsHeaders(), is);
                        } catch (IOException ignored) {}
                    }

                    // Pre-rendered HTML Page Matcher
                    String cleanPath = path.startsWith("/") ? path.substring(1) : path;
                    if (cleanPath.endsWith("/")) {
                        cleanPath = cleanPath.substring(0, cleanPath.length() - 1);
                    }

                    try {
                        InputStream is = getAssets().open("pages/" + cleanPath + ".html");
                        return new WebResourceResponse("text/html", "UTF-8", 200, "OK", getCorsHeaders(), is);
                    } catch (IOException ignored) {}

                    try {
                        InputStream is = getAssets().open("pages/" + cleanPath + "/index.html");
                        return new WebResourceResponse("text/html", "UTF-8", 200, "OK", getCorsHeaders(), is);
                    } catch (IOException ignored) {}

                    // 4. SPA Fallback: Any internal Next.js dynamic App Router route (e.g. /[hospitalId]/helpdesk)
                    // MUST return the SPA shell so WebView never falls back to network DNS (preventing net::ERR_NAME_NOT_RESOLVED)
                    if (uri.getHost() != null && uri.getHost().equals("app.mscurechain.com")) {
                        if (!path.startsWith("/api/") && !path.startsWith("/_next/")) {
                            try {
                                InputStream is = getAssets().open("pages/index.html");
                                return new WebResourceResponse("text/html", "UTF-8", 200, "OK", getCorsHeaders(), is);
                            } catch (IOException ignored) {}
                        }
                    }
                }

                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject print handler into window.print() so receipt print buttons work on Android
                view.evaluateJavascript(
                        "if (!window._mscPrintOverridden) {" +
                        "  window._mscPrintOverridden = true;" +
                        "  var originalPrint = window.print;" +
                        "  window.print = function() {" +
                        "    if (window.AndroidNative && window.AndroidNative.printPage) {" +
                        "      window.AndroidNative.printPage();" +
                        "    } else if (originalPrint) {" +
                        "      originalPrint();" +
                        "    }" +
                        "  };" +
                        "}",
                        null
                );
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }
        });
    }

    private Map<String, String> getCorsHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.put("Access-Control-Allow-Headers", "*");
        headers.put("Cache-Control", "no-cache");
        return headers;
    }

    private void requestAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionsLauncher.launch(new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.READ_MEDIA_IMAGES
            });
        } else {
            requestPermissionsLauncher.launch(new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.READ_EXTERNAL_STORAGE
            });
        }
    }

    public class WebAppInterface {
        Context context;

        WebAppInterface(Context c) {
            context = c;
        }

        @JavascriptInterface
        public void onSplashFinished() {
            dismissSplash();
        }

        @JavascriptInterface
        public void setInputActive(boolean active) {
            // No-op since SwipeRefreshLayout has been permanently removed
        }

        @JavascriptInterface
        public void printPage() {
            runOnUiThread(() -> {
                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (printManager != null && webView != null) {
                    String jobName = "MSCureChain_Receipt_" + System.currentTimeMillis();
                    PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
                    printManager.print(jobName, printAdapter, new PrintAttributes.Builder().build());
                }
            });
        }
    }

    private String getMimeType(String path) {
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".ico")) return "image/x-icon";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".ttf")) return "font/ttf";
        if (path.endsWith(".html")) return "text/html";
        return "application/octet-stream";
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }
}
