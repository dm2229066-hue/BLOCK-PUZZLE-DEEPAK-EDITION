package com.deepak.blockpuzzle;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdMobInterstitialPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
