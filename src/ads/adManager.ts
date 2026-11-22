import { Capacitor, registerPlugin } from '@capacitor/core';
import { soundEngine } from '../audio/soundEngine';

export interface AdShowResult {
  shown: boolean;
  reason?: string;
}

export interface AdInitResult {
  initialized: boolean;
  canRequestAds: boolean;
  privacyOptionsRequired?: boolean;
}

export interface AdStatusResult {
  initialized: boolean;
  loaded: boolean;
  loading: boolean;
  showing: boolean;
  isDebugBuild: boolean;
  adUnitId: string;
  bannerAdUnitId?: string;
  bannerLoaded?: boolean;
  bannerLoading?: boolean;
  bannerVisible?: boolean;
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
  lastLoadErrorCode?: number;
  lastLoadErrorMessage?: string;
  bannerLastLoadErrorCode?: number;
  bannerLastLoadErrorMessage?: string;
}

interface AdMobInterstitialNativePlugin {
  initialize(): Promise<AdInitResult>;
  preload(): Promise<{ loading: boolean; loaded: boolean }>;
  showIfLoaded(): Promise<AdShowResult>;
  showBanner(): Promise<{ bannerEnabled: boolean; bannerLoaded: boolean }>;
  hideBanner(): Promise<void>;
  getStatus(): Promise<AdStatusResult>;
  showPrivacyOptionsForm(): Promise<{ canRequestAds: boolean }>;
  addListener(
    eventName:
      | 'adLoaded'
      | 'adFailedToLoad'
      | 'adOpened'
      | 'adDismissed'
      | 'adFailedToShow'
      | 'adImpression'
      | 'bannerLoaded'
      | 'bannerFailedToLoad',
    listenerFunc: (data: Record<string, unknown>) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const AdMobInterstitial = registerPlugin<AdMobInterstitialNativePlugin>('AdMobInterstitial');

export const MIN_INTERSTITIAL_INTERVAL_MS = 120_000; // 120 seconds
export const COMPLETED_LEVELS_PER_AD = 3;
const INIT_TIMEOUT_MS = 7_500;

export type AdBreakTrigger =
  | 'level_complete'
  | 'game_over'
  | 'return_to_menu'
  | 'between_sessions';

/**
 * Pure frequency-control & policy gatekeeper for Interstitial Ads.
 * Exported as a class so it can be deterministically unit-tested.
 */
export class InterstitialFrequencyController {
  private lastAdShownAtMs: number | null = null;
  private completedLevelsCount = 0;
  private isShowing = false;
  private activeGameplay = false;
  private initialized = false;

  public markInitialized(): void {
    this.initialized = true;
  }

  public setActiveGameplay(active: boolean): void {
    this.activeGameplay = active;
  }

  public setShowing(showing: boolean): void {
    this.isShowing = showing;
  }

  public recordLevelCompleted(): number {
    this.completedLevelsCount += 1;
    return this.completedLevelsCount;
  }

  public getCompletedLevelsCount(): number {
    return this.completedLevelsCount;
  }

  public canShowAtBreak(
    trigger: AdBreakTrigger,
    nowMs: number,
    options?: { meaningfulPlay?: boolean }
  ): { allowed: boolean; reason?: string } {
    if (!this.initialized) {
      return { allowed: false, reason: 'not_initialized' };
    }
    if (this.activeGameplay) {
      return { allowed: false, reason: 'active_gameplay_blocked' };
    }
    if (this.isShowing) {
      return { allowed: false, reason: 'already_showing' };
    }

    if (trigger === 'level_complete') {
      if (this.completedLevelsCount === 0 || this.completedLevelsCount % COMPLETED_LEVELS_PER_AD !== 0) {
        return { allowed: false, reason: 'level_frequency_gate' };
      }
    }

    if (
      (trigger === 'return_to_menu' || trigger === 'between_sessions') &&
      options?.meaningfulPlay === false
    ) {
      return { allowed: false, reason: 'no_meaningful_play' };
    }

    if (
      this.lastAdShownAtMs !== null &&
      nowMs - this.lastAdShownAtMs < MIN_INTERSTITIAL_INTERVAL_MS
    ) {
      return { allowed: false, reason: 'cooldown_120s_active' };
    }

    return { allowed: true };
  }

  public markAdShown(nowMs: number): void {
    this.lastAdShownAtMs = nowMs;
  }

  public getSecondsUntilNextEligible(nowMs: number): number {
    if (this.lastAdShownAtMs === null) return 0;
    const elapsed = nowMs - this.lastAdShownAtMs;
    return Math.max(0, Math.ceil((MIN_INTERSTITIAL_INTERVAL_MS - elapsed) / 1000));
  }
}

class AdManager {
  private readonly controller = new InterstitialFrequencyController();
  private initPromise: Promise<void> | null = null;
  private privacyOptionsRequired = false;
  private listenersAttached = false;

  private isNativeInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isNativeInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.controller.markInitialized();
      if (!Capacitor.isNativePlatform()) {
        // Web browser: never simulate ads or show fake HTML ads
        this.isNativeInitialized = true;
        return;
      }

      try {
        if (!this.listenersAttached) {
          await AdMobInterstitial.addListener('adOpened', () => {
            soundEngine.handleVisibilityChange(true);
          });
          await AdMobInterstitial.addListener('adDismissed', () => {
            soundEngine.handleVisibilityChange(false);
          });
          await AdMobInterstitial.addListener('adFailedToShow', () => {
            soundEngine.handleVisibilityChange(false);
          });
          this.listenersAttached = true;
        }

        const res = await Promise.race<AdInitResult | null>([
          AdMobInterstitial.initialize(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), INIT_TIMEOUT_MS)),
        ]);
        if (res) {
          this.privacyOptionsRequired = Boolean(res.privacyOptionsRequired);
          this.isNativeInitialized = Boolean(res.initialized);
        }
        if (!this.isNativeInitialized) {
          this.initPromise = null;
        }
      } catch {
        // Offline or plugin unavailable: allow retrying later without blocking gameplay
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public setActiveGameplay(active: boolean): void {
    this.controller.setActiveGameplay(active);
  }

  public recordLevelCompleted(): number {
    return this.controller.recordLevelCompleted();
  }

  public async preloadNext(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      if (!this.isNativeInitialized) {
        await this.initialize();
      }
      await AdMobInterstitial.preload();
    } catch {
      // Ignore preload errors; never block gameplay
    }
  }

  public async maybeShowInterstitial(
    trigger: AdBreakTrigger,
    options?: { meaningfulPlay?: boolean }
  ): Promise<AdShowResult> {
    if (!this.isNativeInitialized) {
      await this.initialize();
    }

    const check = this.controller.canShowAtBreak(trigger, Date.now(), options);
    if (!check.allowed) {
      return { shown: false, reason: check.reason };
    }

    if (!Capacitor.isNativePlatform()) {
      return { shown: false, reason: 'web_platform' };
    }

    this.controller.setShowing(true);
    try {
      soundEngine.handleVisibilityChange(true);
      const res = await AdMobInterstitial.showIfLoaded();
      if (res?.shown) {
        this.controller.markAdShown(Date.now());
      }
      return res ?? { shown: false, reason: 'unknown' };
    } catch {
      return { shown: false, reason: 'native_error' };
    } finally {
      this.controller.setShowing(false);
      soundEngine.handleVisibilityChange(false);
    }
  }

  public isPrivacyOptionsRequired(): boolean {
    return this.privacyOptionsRequired;
  }

  public async openPrivacyOptions(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await AdMobInterstitial.showPrivacyOptionsForm();
      await this.preloadNext();
    } catch {
      // ignore
    }
  }

  public async showBanner(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      if (!this.isNativeInitialized) {
        await this.initialize();
      }
      await AdMobInterstitial.showBanner();
    } catch {
      // Ignore banner errors; never block gameplay
    }
  }

  public async hideBanner(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await AdMobInterstitial.hideBanner();
    } catch {
      // Ignore
    }
  }

  public async getNativeStatus(): Promise<AdStatusResult | null> {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      return await AdMobInterstitial.getStatus();
    } catch {
      return null;
    }
  }
}

export const adManager = new AdManager();
