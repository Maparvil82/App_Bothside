package com.bothside.audiocan;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class ChromaprintModule extends ReactContextBaseJavaModule {
   ChromaprintModule(ReactApplicationContext context) {
       super(context);
   }

   @Override
   public String getName() {
       return "ChromaprintModule";
   }

   @ReactMethod
   public void generateFingerprint(String filePath, Promise promise) {
       // Placeholder logic
       promise.resolve("FAKE_FINGERPRINT_ANDROID");
   }
}
