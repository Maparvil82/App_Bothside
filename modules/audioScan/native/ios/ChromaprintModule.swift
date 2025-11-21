import Foundation
import React

@objc(ChromaprintModule)
class ChromaprintModule: NSObject {
  
  @objc(generateFingerprint:resolver:rejecter:)
  func generateFingerprint(_ filePath: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Placeholder logic
    resolve("FAKE_FINGERPRINT_IOS")
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
