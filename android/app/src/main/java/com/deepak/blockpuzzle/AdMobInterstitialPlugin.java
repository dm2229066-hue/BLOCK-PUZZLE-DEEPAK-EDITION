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

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "AdMobInterstitial")
public class AdMobInterstitialPlugin extends Plugin {
    private static final String TAG = "AdMobInterstitial";
    private static final Pattern AD_UNIT_PATTERN =
            Pattern.compile("^ca-app-pub-\\d{16}/\\d{10}$");
    private static final long[] RETRY_DELAYS_MS = {5_000L, 15_000L, 30_000L};

    private final AtomicBoolean isMobileAdsInitialized = new AtomicBoolean(false);
    private final AtomicBoolean isSdkInitStarted = new AtomicBoolean(false);
    private final AtomicBoolean isConsentFlowRunning = new AtomicBoolean(false);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private ConsentInformation consentInformation;
    private InterstitialAd interstitialAd;
    private boolean isLoading = false;
    private boolean isShowing = false;
    private boolean isActivityResumed = true;
    private int retryAttempt = 0;
    private PluginCall pendingShowCall = null;

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        isActivityResumed = true;
        // Retry loading if an ad isn't loaded yet when returning to foreground
        if (isMobileAdsInitialized.get() && interstitialAd == null && !isLoading) {
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
            JSObject res = new JSObject();
            res.put("initialized", false);
            res.put("canRequestAds", false);
            call.resolve(res);
            return;
        }

        if (isMobileAdsInitialized.get()) {
            preloadInternal();
            JSObject res = new JSObject();
            res.put("initialized", true);
            res.put("canRequestAds", true);
            res.put("privacyOptionsRequired", isPrivacyRequired());
            call.resolve(res);
            return;
        }

        if (!isConsentFlowRunning.compareAndSet(false, true)) {
            JSObject res = new JSObject();
            res.put("initialized", isMobileAdsInitialized.get());
            res.put("canRequestAds", isMobileAdsInitialized.get());
            call.resolve(res);
            return;
        }

        ConsentRequestParameters params = new ConsentRequestParameters.Builder()
                .setTagForUnderAgeOfConsent(false)
                .build();

        consentInformation = UserMessagingPlatform.getConsentInformation(activity);
        consentInformation.requestConsentInfoUpdate(
                activity,
                params,
                () -> activity.runOnUiThread(() -> {
                    if (activity.isFinishing() || activity.isDestroyed()) {
                        isConsentFlowRunning.set(false);
                        return;
                    }
                    UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                            activity,
                            loadAndShowError -> {
                                isConsentFlowRunning.set(false);
                                if (loadAndShowError != null) {
                                    Log.w(TAG, "UMP consent form warning: " + loadAndShowError.getMessage());
                                }
                                // If UMP allows ads OR if form failed to load due to missing AdMob console form
                                if (consentInformation.canRequestAds() || loadAndShowError != null) {
                                    startMobileAdsSdk(activity, call);
                                } else {
                                    JSObject res = new JSObject();
                                    res.put("initialized", false);
                                    res.put("canRequestAds", false);
                                    res.put("privacyOptionsRequired", isPrivacyRequired());
                                    call.resolve(res);
                                }
                            }
                    );
                }),
                requestConsentError -> {
                    isConsentFlowRunning.set(false);
                    Log.w(TAG, "UMP consent info update unavailable (e.g. no UMP form configured or offline): "
                            + requestConsentError.getMessage());
                    // Fallback: still initialize Google Mobile Ads SDK so non-EEA / unconfigured-UMP installs can load ads
                    startMobileAdsSdk(activity, call);
                }
        );

        // If previously consented, kick off MobileAds initialization in parallel per Google UMP guide
        if (consentInformation.canRequestAds() && !isSdkInitStarted.get()) {
            startMobileAdsSdk(activity, null);
        }
    }

    private void startMobileAdsSdk(@NonNull Activity activity, PluginCall callToResolve) {
        if (isMobileAdsInitialized.get()) {
            preloadInternal();
            if (callToResolve != null) {
                resolveInitSuccess(callToResolve);
            }
            return;
        }

        if (!isSdkInitStarted.compareAndSet(false, true)) {
            if (callToResolve != null) {
                resolveInitSuccess(callToResolve);
            }
            return;
        }

        new Thread(() -> {
            try {
                MobileAds.initialize(activity.getApplicationContext(), initializationStatus -> {
                    isMobileAdsInitialized.set(true);
                    Log.d(TAG, "Google Mobile Ads SDK initialized.");
                    activity.runOnUiThread(() -> {
                        preloadInternal();
                        if (callToResolve != null) {
                            resolveInitSuccess(callToResolve);
                        }
                    });
                });
            } catch (Exception e) {
                isSdkInitStarted.set(false);
                Log.e(TAG, "MobileAds.initialize failed: " + e.getMessage());
                if (callToResolve != null) {
                    JSObject res = new JSObject();
                    res.put("initialized", false);
                    res.put("canRequestAds", false);
                    callToResolve.resolve(res);
                }
            }
        }).start();
    }

    private void resolveInitSuccess(PluginCall call) {
        JSObject res = new JSObject();
        res.put("initialized", true);
        res.put("canRequestAds", true);
        res.put("privacyOptionsRequired", isPrivacyRequired());
        call.resolve(res);
    }

    @PluginMethod
    public void preload(PluginCall call) {
        final Activity activity = getActivity();
        if (!isMobileAdsInitialized.get() && activity != null && !activity.isFinishing() && !activity.isDestroyed()) {
            startMobileAdsSdk(activity, null);
        } else {
            retryAttempt = 0;
            preloadInternal();
        }
        JSObject res = new JSObject();
        res.put("loading", isLoading);
        res.put("loaded", interstitialAd != null);
        call.resolve(res);
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

        activity.runOnUiThread(() -> {
            if (isLoading || interstitialAd != null) return;
            if (activity.isFinishing() || activity.isDestroyed()) return;

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
                            Log.w(TAG, "Interstitial ad failed to load (code "
                                    + loadAdError.getCode() + "): " + loadAdError.getMessage());
                            JSObject event = new JSObject();
                            event.put("code", loadAdError.getCode());
                            event.put("message", loadAdError.getMessage());
                            notifyListeners("adFailedToLoad", event);

                            // Schedule automatic retry with backoff if within retry cap
                            if (retryAttempt < RETRY_DELAYS_MS.length) {
                                long delay = RETRY_DELAYS_MS[retryAttempt];
                                retryAttempt++;
                                mainHandler.postDelayed(() -> preloadInternal(), delay);
                            }
                        }
                    }
            );
        });
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
                // Immediately preload the next interstitial ad after dismissal
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

        activity.runOnUiThread(() -> {
            if (!isMobileAdsInitialized.get()) {
                startMobileAdsSdk(activity, null);
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", "sdk_initializing");
                call.resolve(res);
                return;
            }

            if (interstitialAd == null) {
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", "not_loaded");
                call.resolve(res);
                retryAttempt = 0;
                preloadInternal();
                return;
            }

            if (activity.isFinishing() || activity.isDestroyed() || !isActivityResumed) {
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", "activity_not_ready");
                call.resolve(res);
                return;
            }

            pendingShowCall = call;
            interstitialAd.show(activity);
        });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject res = new JSObject();
        res.put("initialized", isMobileAdsInitialized.get());
        res.put("loaded", interstitialAd != null);
        res.put("loading", isLoading);
        res.put("showing", isShowing);
        res.put("isDebugBuild", BuildConfig.DEBUG);
        res.put("adUnitId", BuildConfig.ADMOB_INTERSTITIAL_AD_UNIT_ID);
        res.put("canRequestAds", isMobileAdsInitialized.get());
        res.put("privacyOptionsRequired", isPrivacyRequired());
        call.resolve(res);
    }

    @PluginMethod
    public void showPrivacyOptionsForm(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(() ->
                UserMessagingPlatform.showPrivacyOptionsForm(activity, formError -> {
                    if (formError != null) {
                        Log.w(TAG, "Privacy options form error: " + formError.getMessage());
                    }
                    JSObject res = new JSObject();
                    res.put("canRequestAds", consentInformation != null && consentInformation.canRequestAds());
                    call.resolve(res);
                })
        );
    }

    private boolean isPrivacyRequired() {
        return consentInformation != null
                && consentInformation.getPrivacyOptionsRequirementStatus()
                == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }
}
