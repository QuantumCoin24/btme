import ExpoModulesCore
import Vision
import ImageIO

public class BtmeLiveVerificationModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BtmeLiveVerification")

    AsyncFunction("analyseFace") {
      (imageUri: String) throws -> [String: Any] in

      let path = try resolvePath(imageUri)
      defer {
        try? FileManager.default.removeItem(atPath: path)
      }

      guard FileManager.default.fileExists(atPath: path) else {
        throw VerificationError.imageNotFound
      }

      let url = URL(fileURLWithPath: path)

      guard let source = CGImageSourceCreateWithURL(
        url as CFURL,
        nil
      ) else {
        throw VerificationError.invalidImage
      }

      guard let image = CGImageSourceCreateImageAtIndex(
        source,
        0,
        nil
      ) else {
        throw VerificationError.invalidImage
      }

      let request = VNDetectFaceCaptureQualityRequest()

      let handler = VNImageRequestHandler(
        cgImage: image,
        orientation: .up,
        options: [:]
      )

      try handler.perform([request])

      let observations =
        request.results ?? []

      guard observations.count == 1,
            let face = observations.first else {
        return [
          "faceCount": observations.count,
          "hasSingleFace": false,
          "captureQuality": NSNull(),
          "yaw": NSNull(),
          "roll": NSNull(),
          "pitch": NSNull(),
          "centerX": NSNull(),
          "centerY": NSNull(),
          "width": NSNull(),
          "height": NSNull()
        ]
      }

      return [
        "faceCount": observations.count,
        "hasSingleFace": true,
        "captureQuality":
          face.faceCaptureQuality.map { Double($0) } ?? NSNull(),
        "yaw":
          face.yaw?.doubleValue ?? NSNull(),
        "roll":
          face.roll?.doubleValue ?? NSNull(),
        "pitch":
          face.pitch?.doubleValue ?? NSNull(),
        "centerX":
          Double(face.boundingBox.midX),
        "centerY":
          Double(face.boundingBox.midY),
        "width":
          Double(face.boundingBox.width),
        "height":
          Double(face.boundingBox.height)
      ]
    }

    AsyncFunction("deleteTemporaryImage") {
      (imageUri: String) throws -> Bool in

      let path = try resolvePath(imageUri)

      guard FileManager.default.fileExists(atPath: path) else {
        return true
      }

      try FileManager.default.removeItem(atPath: path)
      return !FileManager.default.fileExists(atPath: path)
    }
  }

  private func resolvePath(_ imageUri: String) throws -> String {
    if imageUri.hasPrefix("file://"),
       let url = URL(string: imageUri) {
      return url.path
    }

    guard !imageUri.isEmpty else {
      throw VerificationError.invalidImage
    }

    return imageUri
  }
}

enum VerificationError: Error {
  case imageNotFound
  case invalidImage
}
