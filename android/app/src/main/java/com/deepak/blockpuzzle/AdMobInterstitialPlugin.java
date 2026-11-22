package com.deepak.blockpuzzle;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "AdMobInterstitial")
public class AdMobInterstitialPlugin extends Plugin {
    private static final String TAG = "AdMobInterstitial";
    private static final Pattern AD_UNIT_PATTERN =
            Pattern.compile("^ca-app-pub-\\d{16}/\\d{10}$");
    private static final long[] RETRY_DELAYS_MS = {5_000L, 15_000L, 30_000L, 60_000L};
    private static final long UMP_TIMEOUT_MS = 6_000L;

    private final AtomicBoolean isMobileAdsInitialized = new AtomicBoolean(false);
    private final AtomicBoolean isSdkInitStarted = new AtomicBoolean(false);
    private final AtomicBoolean isConsentFlowRunning = new AtomicBoolean(false);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final List<PluginCall> pendingInitCalls = new ArrayList<>();

    private ConsentInformation consentInformation;
    private InterstitialAd interstitialAd;
    private boolean isLoading = false;
    private boolean isShowing = false;
    private boolean isActivityResumed = true;
    private int retryAttempt = 0;
    private int lastLoadErrorCode = 0;
    private String lastLoadErrorMessage = "";
    private PluginCall pendingShowCall = null;

    private final Runnable retryLoadRunnable = this::preloadInternal;

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        isActivityResumed = true;
        if (isMobileAdsInitialized.get() && interstitialAd == null && !isLoading) {
            retryAttempt = 0;
            preloadInternal();
        }
    }

    @Override
    protected void handleOnPause() {
        isActivityResumed = false;
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        resolvePendingInitCalls(false, false);
        if (pendingShowCall != null) {
            JSObject res = new JSObject();
            res.put("shown", false);
            res.put("reason", "activity_destroyed");
            pendingShowCall.resolve(res);
            pendingShowCall = null;
        }
        interstitialAd = null;
        isLoading = false;
        isShowing = false;
        super.handleOnDestroy();
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            resolveInitResult(call, false, false);
            return;
        }

        // UMP & AdMob UI state MUST execute on the Android Main (UI) Thread,
        // because Capacitor executes @PluginMethod on a background HandlerThread.
        mainHandler.post(() -> initializeOnMainThread(activity, call));
    }

    private void initializeOnMainThread(@NonNull Activity activity, @NonNull PluginCall call) {
        if (activity.isFinishing() || activity.isDestroyed()) {
            resolveInitResult(call, false, false);
            return;
        }

        if (isMobileAdsInitialized.get()) {
            preloadInternal();
            resolveInitResult(call, true, true);
            return;
        }

        pendingInitCalls.add(call);

        if (!isConsentFlowRunning.compareAndSet(false, true)) {
            if (isSdkInitStarted.get()) {
                return;
            }
            return;
        }

        final AtomicBoolean consentStepCompleted = new AtomicBoolean(false);
        final Runnable umpTimeoutRunnable = () -> {
            if (consentStepCompleted.compareAndSet(false, true)) {
                isConsentFlowRunning.set(false);
                Log.w(TAG, "UMP consent check timed out; starting MobileAds SDK fallback.");
                startMobileAdsSdk(activity);
            }
        };
        mainHandler.postDelayed(umpTimeoutRunnable, UMP_TIMEOUT_MS);

        try {
            ConsentRequestParameters params = new ConsentRequestParameters.Builder()
                    .setTagForUnderAgeOfConsent(false)
                    .build();

            consentInformation = UserMessagingPlatform.getConsentInformation(activity);

            // If consent was already obtained or not required on a prior launch, start MobileAds immediately
            if (consentInformation.canRequestAds() && !isSdkInitStarted.get()) {
                startMobileAdsSdk(activity);
            }

            consentInformation.requestConsentInfoUpdate(
                    activity,
                    params,
                    () -> mainHandler.post(() -> {
                        if (activity.isFinishing() || activity.isDestroyed()) {
                            mainHandler.removeCallbacks(umpTimeoutRunnable);
                            consentStepCompleted.set(true);
                            isConsentFlowRunning.set(false);
                            resolvePendingInitCalls(false, false);
                            return;
                        }
                        UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                                activity,
                                loadAndShowError -> {
                                    mainHandler.removeCallbacks(umpTimeoutRunnable);
                                    if (!consentStepCompleted.compareAndSet(false, true)) {
                                        return;
                                    }
                                    isConsentFlowRunning.set(false);
                                    if (loadAndShowError != null) {
                                        Log.w(TAG, "UMP consent form warning: " + loadAndShowError.getMessage());
                                    }
                                    boolean explicitlyDenied = consentInformation != null
                                            && consentInformation.getConsentStatus()
                                            == ConsentInformation.ConsentStatus.OBTAINED
                                            && !consentInformation.canRequestAds();
                                    if (!explicitlyDenied) {
                                        startMobileAdsSdk(activity);
                                    } else {
                                        resolvePendingInitCalls(false, false);
                                    }
                                }
                        );
                    }),
                    requestConsentError -> mainHandler.post(() -> {
                        mainHandler.removeCallbacks(umpTimeoutRunnable);
                        if (!consentStepCompleted.compareAndSet(false, true)) {
                            return;
                        }
                        isConsentFlowRunning.set(false);
                        Log.w(TAG, "UMP consent info update unavailable: "
                                + requestConsentError.getMessage());
                        startMobileAdsSdk(activity);
                    })
            );
        } catch (Throwable t) {
            mainHandler.removeCallbacks(umpTimeoutRunnable);
            if (consentStepCompleted.compareAndSet(false, true)) {
                isConsentFlowRunning.set(false);
                Log.w(TAG, "UMP threw exception; falling back to MobileAds.initialize: " + t.getMessage());
                startMobileAdsSdk(activity);
            }
        }
    }

    private void startMobileAdsSdk(@NonNull Activity activity) {
        if (isMobileAdsInitialized.get()) {
            preloadInternal();
            resolvePendingInitCalls(true, true);
            return;
        }

        if (!isSdkInitStarted.compareAndSet(false, true)) {
            return;
        }

        new Thread(() -> {
            try {
                MobileAds.initialize(activity.getApplicationContext(), initializationStatus ->
                        mainHandler.post(() -> {
                            isMobileAdsInitialized.set(true);
                            Log.d(TAG, "Google Mobile Ads SDK initialized.");
                            preloadInternal();
                            resolvePendingInitCalls(true, true);
                        })
                );
            } catch (Throwable t) {
                mainHandler.post(() -> {
                    isSdkInitStarted.set(false);
                    Log.e(TAG, "MobileAds.initialize failed: " + t.getMessage());
                    resolvePendingInitCalls(false, false);
                });
            }
        }).start();
    }

    private void resolveInitResult(@NonNull PluginCall call, boolean initialized, boolean canRequestAds) {
        JSObject res = new JSObject();
        res.put("initialized", initialized);
        res.put("canRequestAds", canRequestAds);
        res.put("privacyOptionsRequired", isPrivacyRequired());
        call.resolve(res);
    }

    private void resolvePendingInitCalls(boolean initialized, boolean canRequestAds) {
        if (pendingInitCalls.isEmpty()) return;
        List<PluginCall> calls = new ArrayList<>(pendingInitCalls);
        pendingInitCalls.clear();
        for (PluginCall c : calls) {
            resolveInitResult(c, initialized, canRequestAds);
        }
    }

    @PluginMethod
    public void preload(PluginCall call) {
        mainHandler.post(() -> {
            final Activity activity = getActivity();
            if (!isMobileAdsInitialized.get()
                    && activity != null
                    && !activity.isFinishing()
                    && !activity.isDestroyed()) {
                startMobileAdsSdk(activity);
            } else if (interstitialAd == null && !isLoading) {
                retryAttempt = 0;
                preloadInternal();
            }
            JSObject res = new JSObject();
            res.put("loading", isLoading);
            res.put("loaded", interstitialAd != null);
            call.resolve(res);
        });
    }

    private void preloadInternal() {
        final Activity activity = getActivity();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;
        if (!isMobileAdsInitialized.get()) return;
        if (isLoading || interstitialAd != null) return;

        final String adUnitId = BuildConfig.ADMOB_INTERSTITIAL_AD_UNIT_ID;
        if (adUnitId == null || !AD_UNIT_PATTERN.matcher(adUnitId).matches()) {
            Log.e(TAG, "Invalid Interstitial Ad Unit ID format: " + adUnitId);
            return;
        }

        mainHandler.removeCallbacks(retryLoadRunnable);
        isLoading = true;
        AdRequest adRequest = new AdRequest.Builder().build();

        InterstitialAd.load(
                activity,
                adUnitId,
                adRequest,
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(@NonNull InterstitialAd ad) {
                        isLoading = false;
                        retryAttempt = 0;
                        lastLoadErrorCode = 0;
                        lastLoadErrorMessage = "";
                        interstitialAd = ad;
                        attachFullScreenCallback(ad);
                        Log.d(TAG, "Interstitial ad preloaded successfully for " + adUnitId);
                        JSObject event = new JSObject();
                        event.put("loaded", true);
                        notifyListeners("adLoaded", event);
                    }

                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                        isLoading = false;
                        interstitialAd = null;
                        lastLoadErrorCode = loadAdError.getCode();
                        lastLoadErrorMessage = loadAdError.getMessage();
                        Log.w(TAG, "Interstitial ad failed to load (code "
                                + loadAdError.getCode() + "): " + loadAdError.getMessage());
                        JSObject event = new JSObject();
                        event.put("code", loadAdError.getCode());
                        event.put("message", loadAdError.getMessage());
                        notifyListeners("adFailedToLoad", event);

                        if (retryAttempt < RETRY_DELAYS_MS.length) {
                            long delay = RETRY_DELAYS_MS[retryAttempt];
                            retryAttempt++;
                            mainHandler.removeCallbacks(retryLoadRunnable);
                            mainHandler.postDelayed(retryLoadRunnable, delay);
                        }
                    }
                }
        );
    }

    private void attachFullScreenCallback(@NonNull InterstitialAd ad) {
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdShowedFullScreenContent() {
                isShowing = true;
                interstitialAd = null;
                notifyListeners("adOpened", new JSObject());
            }

            @Override
            public void onAdImpression() {
                notifyListeners("adImpression", new JSObject());
            }

            @Override
            public void onAdDismissedFullScreenContent() {
                isShowing = false;
                notifyListeners("adDismissed", new JSObject());
                if (pendingShowCall != null) {
                    JSObject res = new JSObject();
                    res.put("shown", true);
                    pendingShowCall.resolve(res);
                    pendingShowCall = null;
                }
                retryAttempt = 0;
                preloadInternal();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                isShowing = false;
                interstitialAd = null;
                Log.w(TAG, "Interstitial failed to show: " + adError.getMessage());
                JSObject err = new JSObject();
                err.put("code", adError.getCode());
                err.put("message", adError.getMessage());
                notifyListeners("adFailedToShow", err);

                if (pendingShowCall != null) {
                    JSObject res = new JSObject();
                    res.put("shown", false);
                    res.put("reason", adError.getMessage());
                    pendingShowCall.resolve(res);
                    pendingShowCall = null;
                }
                retryAttempt = 0;
                preloadInternal();
            }
        });
    }

    @PluginMethod
    public void showIfLoaded(PluginCall call) {
        mainHandler.post(() -> {
            final Activity activity = getActivity();
            if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", "activity_unavailable");
                call.resolve(res);
                return;
            }

            if (!isActivityResumed) {
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", "activity_paused");
                call.resolve(res);
                return;
            }

            if (isShowing || pendingShowCall != null) {
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", "already_showing");
                call.resolve(res);
                return;
            }

            if (!isMobileAdsInitialized.get()) {
                startMobileAdsSdk(activity);
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", "sdk_initializing");
                call.resolve(res);
                return;
            }

            if (interstitialAd == null) {
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", lastLoadErrorCode != 0 ? "not_loaded_code_" + lastLoadErrorCode : "not_loaded");
                call.resolve(res);
                retryAttempt = 0;
                preloadInternal();
                return;
            }

            try {
                pendingShowCall = call;
                interstitialAd.show(activity);
            } catch (Throwable t) {
                Log.e(TAG, "Exception showing interstitial ad: " + t.getMessage());
                isShowing = false;
                interstitialAd = null;
                if (pendingShowCall != null) {
                    JSObject res = new JSObject();
                    res.put("shown", false);
                    res.put("reason", "show_exception");
                    pendingShowCall.resolve(res);
                    pendingShowCall = null;
                }
                retryAttempt = 0;
                preloadInternal();
            }
        });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        mainHandler.post(() -> {
            JSObject res = new JSObject();
            res.put("initialized", isMobileAdsInitialized.get());
            res.put("loaded", interstitialAd != null);
            res.put("loading", isLoading);
            res.put("showing", isShowing);
            res.put("isDebugBuild", BuildConfig.DEBUG);
            res.put("adUnitId", BuildConfig.ADMOB_INTERSTITIAL_AD_UNIT_ID);
            res.put("canRequestAds", isMobileAdsInitialized.get());
            res.put("privacyOptionsRequired", isPrivacyRequired());
            res.put("lastLoadErrorCode", lastLoadErrorCode);
            res.put("lastLoadErrorMessage", lastLoadErrorMessage);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void showPrivacyOptionsForm(PluginCall call) {
        mainHandler.post(() -> {
            final Activity activity = getActivity();
            if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
                call.resolve();
                return;
            }
            try {
                UserMessagingPlatform.showPrivacyOptionsForm(activity, formError -> {
                    if (formError != null) {
                        Log.w(TAG, "Privacy options form error: " + formError.getMessage());
                    }
                    JSObject res = new JSObject();
                    res.put("canRequestAds", consentInformation != null && consentInformation.canRequestAds());
                    call.resolve(res);
                });
            } catch (Throwable t) {
                Log.w(TAG, "showPrivacyOptionsForm threw: " + t.getMessage());
                call.resolve();
            }
        });
    }

    private boolean isPrivacyRequired() {
        return consentInformation != null
                && consentInformation.getPrivacyOptionsRequirementStatus()
                == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }
}
