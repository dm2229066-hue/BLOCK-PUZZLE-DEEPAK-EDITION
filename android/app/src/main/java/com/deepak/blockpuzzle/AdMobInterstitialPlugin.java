package com.deepak.blockpuzzle;

import android.app.Activity;
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

    private final AtomicBoolean isMobileAdsInitialized = new AtomicBoolean(false);
    private final AtomicBoolean isInitializing = new AtomicBoolean(false);

    private ConsentInformation consentInformation;
    private InterstitialAd interstitialAd;
    private boolean isLoading = false;
    private boolean isShowing = false;
    private boolean isActivityResumed = true;
    private PluginCall pendingShowCall = null;

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        isActivityResumed = true;
    }

    @Override
    protected void handleOnPause() {
        isActivityResumed = false;
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
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
            res.put("canRequestAds", consentInformation != null && consentInformation.canRequestAds());
            res.put("privacyOptionsRequired", isPrivacyRequired());
            call.resolve(res);
            return;
        }

        if (!isInitializing.compareAndSet(false, true)) {
            JSObject res = new JSObject();
            res.put("initialized", false);
            res.put("canRequestAds", false);
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
                        isInitializing.set(false);
                        return;
                    }
                    UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                            activity,
                            loadAndShowError -> {
                                if (loadAndShowError != null) {
                                    Log.w(TAG, "UMP consent error: " + loadAndShowError.getMessage());
                                }
                                if (consentInformation.canRequestAds()) {
                                    startMobileAdsSdk(activity, call);
                                } else {
                                    isInitializing.set(false);
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
                    Log.w(TAG, "UMP consent info update failed (offline or unavailable): "
                            + requestConsentError.getMessage());
                    // Even if consent refresh fails (e.g. offline), check cached consent state
                    if (consentInformation != null && consentInformation.canRequestAds()) {
                        startMobileAdsSdk(activity, call);
                    } else {
                        isInitializing.set(false);
                        JSObject res = new JSObject();
                        res.put("initialized", false);
                        res.put("canRequestAds", false);
                        res.put("privacyOptionsRequired", false);
                        call.resolve(res);
                    }
                }
        );

        // If previously consented, MobileAds can initialize in parallel per Google UMP guide
        if (consentInformation.canRequestAds() && !isMobileAdsInitialized.get()) {
            startMobileAdsSdk(activity, null);
        }
    }

    private void startMobileAdsSdk(@NonNull Activity activity, PluginCall callToResolve) {
        if (isMobileAdsInitialized.getAndSet(true)) {
            isInitializing.set(false);
            if (callToResolve != null) {
                JSObject res = new JSObject();
                res.put("initialized", true);
                res.put("canRequestAds", true);
                res.put("privacyOptionsRequired", isPrivacyRequired());
                callToResolve.resolve(res);
            }
            return;
        }

        new Thread(() -> MobileAds.initialize(activity.getApplicationContext(), initializationStatus -> {
            isInitializing.set(false);
            Log.d(TAG, "Google Mobile Ads SDK initialized.");
            activity.runOnUiThread(() -> {
                preloadInternal();
                if (callToResolve != null) {
                    JSObject res = new JSObject();
                    res.put("initialized", true);
                    res.put("canRequestAds", true);
                    res.put("privacyOptionsRequired", isPrivacyRequired());
                    callToResolve.resolve(res);
                }
            });
        })).start();
    }

    @PluginMethod
    public void preload(PluginCall call) {
        preloadInternal();
        JSObject res = new JSObject();
        res.put("loading", isLoading);
        res.put("loaded", interstitialAd != null);
        call.resolve(res);
    }

    private void preloadInternal() {
        final Activity activity = getActivity();
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;
        if (!isMobileAdsInitialized.get()) return;
        if (consentInformation != null && !consentInformation.canRequestAds()) return;
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
                            interstitialAd = ad;
                            attachFullScreenCallback(ad);
                            Log.d(TAG, "Interstitial ad preloaded successfully.");
                            JSObject event = new JSObject();
                            event.put("loaded", true);
                            notifyListeners("adLoaded", event);
                        }

                        @Override
                        public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                            isLoading = false;
                            interstitialAd = null;
                            Log.w(TAG, "Interstitial ad failed to load: " + loadAdError.getMessage());
                            JSObject event = new JSObject();
                            event.put("code", loadAdError.getCode());
                            event.put("message", loadAdError.getMessage());
                            notifyListeners("adFailedToLoad", event);
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
            if (interstitialAd == null) {
                JSObject res = new JSObject();
                res.put("shown", false);
                res.put("reason", "not_loaded");
                call.resolve(res);
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
        res.put("canRequestAds", consentInformation != null && consentInformation.canRequestAds());
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
