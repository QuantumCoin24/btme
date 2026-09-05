import {
  NativeModule,
  requireNativeModule,
} from 'expo';

import type {
  FaceAnalysis,
} from './BtmeLiveVerification.types';

declare class BtmeLiveVerificationModule
  extends NativeModule<{}> {
  analyseFace(
    imageUri: string,
  ): Promise<FaceAnalysis>;

  deleteTemporaryImage(
    imageUri: string,
  ): Promise<boolean>;
}

export default requireNativeModule<BtmeLiveVerificationModule>(
  'BtmeLiveVerification',
);
