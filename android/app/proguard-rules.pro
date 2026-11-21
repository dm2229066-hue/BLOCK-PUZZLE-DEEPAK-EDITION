# Keep Capacitor plugins and @PluginMethod members for release builds
-keep class com.deepak.blockpuzzle.AdMobInterstitialPlugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
}
-keepattributes SourceFile,LineNumberTable
