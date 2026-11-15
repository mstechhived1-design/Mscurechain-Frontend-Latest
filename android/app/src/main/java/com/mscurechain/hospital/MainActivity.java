package com.mscurechain.hospital;

import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MSCureChainApp";
    private static final Pattern TENANT_ROUTE_PATTERN = Pattern.compile("^/([^/]+)(?:/(.*))?$");

    private static final Set<String> NON_TENANT_ROOTS = new HashSet<>(Arrays.asList(
        "admin", "patient", "about", "blogs", "receipts", "ambulance",
        "display", "auth", "_next", "assets", "api", "index.html", "favicon.ico"
    ));

    private static final String[] DYNAMIC_PLACEHOLDERS = new String[] {
        "[patientId]", "[id]", "[appointmentId]", "[helpdeskId]", "[slug]"
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Enable cross-origin cookies & configure WebView settings
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setGeolocationEnabled(true);
            settings.setGeolocationDatabasePath(getFilesDir().getPath());
            settings.setTextZoom(100); // Guarantees consistent native mobile layout
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            // Proactively request runtime hardware permissions (Camera, Location, Audio)
            checkAndRequestAppPermissions();

            String ua = settings.getUserAgentString();
            settings.setUserAgentString(ua + " MSCureChainHospitalApp/1.1.2 AndroidBridge/1.0.0");

            // 2. Set custom BridgeWebViewClient to intercept all portal routes and RSC payloads locally
            getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {

                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    String host = uri.getHost();

                    // Network requests: If host is Railway backend or cloud asset host, let it pass through to internet
                    if (host != null && (host.contains("railway.app") || host.contains("cloudinary.com") || host.contains("googleapis.com"))) {
                        return null;
                    }

                    // Handle local requests (localhost, 127.0.0.1, or local scheme)
                    if (host == null || host.equals("localhost") || host.equals("127.0.0.1") || host.contains("mscurechain")) {
                        String path = uri.getPath();
                        if (path == null) path = "/";

                        // Check if Next.js is requesting a React Server Component (RSC) flight payload
                        String query = uri.getQuery();
                        Map<String, String> reqHeaders = request.getRequestHeaders();
                        boolean isRsc = (query != null && query.contains("_rsc=")) ||
                                        (reqHeaders != null && "1".equals(reqHeaders.get("RSC")));

                        // A. Root or login routes -> Serve auth/login.html or index.html
                        if (path.equals("/") || path.equals("/index.html") || path.startsWith("/auth/login")) {
                            WebResourceResponse response = serveAsset("public/auth/login.html", "text/html");
                            if (response == null) {
                                response = serveAsset("public/index.html", "text/html");
                            }
                            if (response != null) {
                                return response;
                            }
                        }

                        // B. Multi-tenant portal routes: /[hospitalId] or /[hospitalId]/<subRoute>
                        Matcher tenantMatcher = TENANT_ROUTE_PATTERN.matcher(path);
                        if (tenantMatcher.matches()) {
                            String firstSegment = tenantMatcher.group(1);
                            if (!NON_TENANT_ROOTS.contains(firstSegment) && !firstSegment.contains(".")) {
                                String subRoute = tenantMatcher.group(2);
                                if (subRoute == null || subRoute.trim().isEmpty()) {
                                    subRoute = "dashboard";
                                }
                                if (subRoute.endsWith("/")) {
                                    subRoute = subRoute.substring(0, subRoute.length() - 1);
                                }

                                if (isRsc) {
                                    // 1. Direct match in public/pages/portal/<subRoute>.rsc
                                    WebResourceResponse rscResp = serveAsset("public/pages/portal/" + subRoute + ".rsc", "text/x-component");
                                    if (rscResp != null) {
                                        return rscResp;
                                    }

                                    // 2. Dynamic ID resolution (e.g. helpdesk/patients/P-1002 -> helpdesk/patients/[patientId].rsc)
                                    String dynamicRsc = resolveDynamicPath(subRoute, ".rsc", "public/pages/portal/");
                                    if (dynamicRsc != null) {
                                        WebResourceResponse dynRscResp = serveAsset("public/pages/portal/" + dynamicRsc, "text/x-component");
                                        if (dynRscResp != null) {
                                            return dynRscResp;
                                        }
                                    }

                                    // 3. Root portal .rsc fallback (e.g. /helpdesk.rsc)
                                    String portalBase = subRoute.contains("/") ? subRoute.substring(0, subRoute.indexOf('/')) : subRoute;
                                    WebResourceResponse baseRsc = serveAsset("public/pages/portal/" + portalBase + ".rsc", "text/x-component");
                                    if (baseRsc != null) {
                                        return baseRsc;
                                    }

                                    // 4. Return 404 for RSC so Next.js falls back cleanly to HTML navigation
                                    Map<String, String> notFoundHeaders = new HashMap<>();
                                    notFoundHeaders.put("Access-Control-Allow-Origin", "*");
                                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", notFoundHeaders, null);
                                } else {
                                    // HTML full page load:
                                    // 1. Direct match in public/pages/portal/<subRoute>.html
                                    WebResourceResponse htmlResp = serveAsset("public/pages/portal/" + subRoute + ".html", "text/html");
                                    if (htmlResp != null) {
                                        return htmlResp;
                                    }

                                    // 2. Dynamic ID resolution (e.g. helpdesk/patients/[patientId].html)
                                    String dynamicHtml = resolveDynamicPath(subRoute, ".html", "public/pages/portal/");
                                    if (dynamicHtml != null) {
                                        WebResourceResponse dynHtmlResp = serveAsset("public/pages/portal/" + dynamicHtml, "text/html");
                                        if (dynHtmlResp != null) {
                                            return dynHtmlResp;
                                        }
                                    }

                                    // 3. Root portal HTML shell fallback
                                    String portalBase = subRoute.contains("/") ? subRoute.substring(0, subRoute.indexOf('/')) : subRoute;
                                    WebResourceResponse baseHtml = serveAsset("public/pages/portal/" + portalBase + ".html", "text/html");
                                    if (baseHtml != null) {
                                        return baseHtml;
                                    }
                                }
                            }
                        }

                        // C. Static Next.js assets (_next/static, assets, chunks, css, media, fonts)
                        if (path.startsWith("/_next/") || path.startsWith("/assets/") || path.contains(".")) {
                            WebResourceResponse capacitorResp = super.shouldInterceptRequest(view, request);
                            if (capacitorResp != null) {
                                return capacitorResp;
                            }
                            String cleanPath = path.startsWith("/") ? path.substring(1) : path;
                            WebResourceResponse directResp = serveAsset("public/" + cleanPath, getMimeType(cleanPath));
                            if (directResp != null) {
                                return directResp;
                            }
                        }

                        // D. Non-tenant routes (e.g. /admin, /admin/hospitals, /patient/dashboard, /display, /about)
                        String nonTenant = path.startsWith("/") ? path.substring(1) : path;
                        if (nonTenant.endsWith("/")) {
                            nonTenant = nonTenant.substring(0, nonTenant.length() - 1);
                        }
                        if (!nonTenant.isEmpty() && !nonTenant.startsWith("_next") && !nonTenant.startsWith("assets")) {
                            if (isRsc) {
                                WebResourceResponse nonTenantRsc = serveAsset("public/pages/" + nonTenant + ".rsc", "text/x-component");
                                if (nonTenantRsc != null) return nonTenantRsc;

                                String dynamicRsc = resolveDynamicPath(nonTenant, ".rsc", "public/pages/");
                                if (dynamicRsc != null) {
                                    WebResourceResponse dynRsc = serveAsset("public/pages/" + dynamicRsc, "text/x-component");
                                    if (dynRsc != null) return dynRsc;
                                }
                            } else {
                                WebResourceResponse nonTenantHtml = serveAsset("public/pages/" + nonTenant + ".html", "text/html");
                                if (nonTenantHtml != null) return nonTenantHtml;

                                String dynamicHtml = resolveDynamicPath(nonTenant, ".html", "public/pages/");
                                if (dynamicHtml != null) {
                                    WebResourceResponse dynHtml = serveAsset("public/pages/" + dynamicHtml, "text/html");
                                    if (dynHtml != null) return dynHtml;
                                }
                            }
                        }

                        // E. Fallback -> serve index.html (Hospital Login Portal)
                        WebResourceResponse defaultResp = serveAsset("public/index.html", "text/html");
                        if (defaultResp != null) {
                            return defaultResp;
                        }
                    }

                    return super.shouldInterceptRequest(view, request);
                }

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    Log.e(TAG, "WebView error: " + error.getDescription() + " for URL: " + request.getUrl());
                    super.onReceivedError(view, request, error);
                }
            });
        }
    }

    /**
     * Resolves dynamic route segments such as:
     * - Last segment: doctor/patients/P-1234 -> doctor/patients/[id]
     * - Middle segment: helpdesk/P-1234/book -> helpdesk/[patientId]/book
     * - Double dynamic: receipts/ipd/REC-01 -> receipts/[type]/[id]
     */
    private String resolveDynamicPath(String subRoute, String ext, String baseFolder) {
        String[] segments = subRoute.split("/");
        if (segments.length < 2) return null;

        AssetManager am = getAssets();

        // 1. Check last segment replacement (most common: .../[id] or .../[patientId])
        for (String ph : DYNAMIC_PLACEHOLDERS) {
            String candidate = replaceSegment(segments, segments.length - 1, ph) + ext;
            if (assetFileExists(am, baseFolder + candidate)) {
                return candidate;
            }
        }

        // 2. Check second-to-last segment replacement (e.g., .../[patientId]/book, .../[helpdeskId]/edit)
        if (segments.length >= 3) {
            for (String ph : DYNAMIC_PLACEHOLDERS) {
                String candidate = replaceSegment(segments, segments.length - 2, ph) + ext;
                if (assetFileExists(am, baseFolder + candidate)) {
                    return candidate;
                }
            }
        }

        // 3. Check two dynamic segments replacement (e.g. receipts/[type]/[id])
        if (segments.length >= 3) {
            for (String ph1 : new String[]{"[type]"}) {
                for (String ph2 : DYNAMIC_PLACEHOLDERS) {
                    String candidate = replaceTwoSegments(segments, segments.length - 2, ph1, segments.length - 1, ph2) + ext;
                    if (assetFileExists(am, baseFolder + candidate)) {
                        return candidate;
                    }
                }
            }
        }

        return null;
    }

    private String replaceSegment(String[] segments, int index, String replacement) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < segments.length; i++) {
            if (i > 0) sb.append("/");
            sb.append(i == index ? replacement : segments[i]);
        }
        return sb.toString();
    }

    private String replaceTwoSegments(String[] segments, int idx1, String rep1, int idx2, String rep2) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < segments.length; i++) {
            if (i > 0) sb.append("/");
            if (i == idx1) sb.append(rep1);
            else if (i == idx2) sb.append(rep2);
            else sb.append(segments[i]);
        }
        return sb.toString();
    }

    private boolean assetFileExists(AssetManager am, String fullPath) {
        try {
            InputStream is = am.open(fullPath);
            is.close();
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private WebResourceResponse serveAsset(String assetPath, String mimeType) {
        try {
            AssetManager am = getAssets();
            InputStream is = am.open(assetPath);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-cache, no-store, must-revalidate");
            headers.put("Content-Type", mimeType + "; charset=utf-8");
            return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, is);
        } catch (Exception e) {
            return null;
        }
    }

    private String getMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".rsc")) return "text/x-component";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    private void checkAndRequestAppPermissions() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            java.util.List<String> needed = new java.util.ArrayList<>();
            if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.CAMERA);
            }
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.ACCESS_FINE_LOCATION);
                needed.add(android.Manifest.permission.ACCESS_COARSE_LOCATION);
            }
            if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.RECORD_AUDIO);
            }
            if (!needed.isEmpty()) {
                requestPermissions(needed.toArray(new String[0]), 101);
            }
        }
    }
}
