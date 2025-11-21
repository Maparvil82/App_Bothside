#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ChromaprintModule, NSObject)

RCT_EXTERN_METHOD(generateFingerprint:(NSString *)filePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
