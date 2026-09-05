import {
  NativeModule,
  registerWebModule,
} from 'expo';

class BtmeLiveVerificationModule
  extends NativeModule<{}> {
  async analyseFace(): Promise<never> {
    throw new Error(
      'BTME live selfie verification is currently available on iOS only.',
    );
  }

  async deleteTemporaryImage(): Promise<boolean> {
    return true;
  }
}

export default registerWebModule(
  BtmeLiveVerificationModule,
  'BtmeLiveVerification',
);
