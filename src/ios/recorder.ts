import * as app from 'application';
import { isString } from 'utils/types';
import { knownFolders, path } from 'file-system';
import { TNSRecordI } from '../common';
import { AudioRecorderOptions, iosSampleRateConversionQuality } from '../options';

declare var interop, kAudioFormatMPEG4AAC, AVAudioQuality, AVAudioRecorderDelegate, AVAudioSession, AVAudioSessionCategoryRecord, AVAudioSessionCategoryPlayAndRecord, NSMutableDictionary, NSNumber, AVAudioRecorder, NSURL;

export class TNSRecorder extends NSObject implements TNSRecordI {
  public static ObjCProtocols = [AVAudioRecorderDelegate];
  private _recorder: any;
  private _recordingSession: any;

  public static CAN_RECORD(): boolean {
    return true;
  }

  get ios() {
    return this._recorder;
  }

  public start(options: AudioRecorderOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        this._recordingSession = AVAudioSession.sharedInstance();
        let errorRef = new interop.Reference();
        this._recordingSession.setCategoryError(AVAudioSessionCategoryPlayAndRecord, errorRef);
        if (errorRef) {
          console.log(`setCategoryError: ${errorRef.value}`);
        }

        this._recordingSession.setActiveError(true, null);
        this._recordingSession.requestRecordPermission((allowed: boolean) => {
          if (allowed) {

            // var recordSetting = new NSMutableDictionary((<any>[NSNumber.numberWithInt(kAudioFormatMPEG4AAC), NSNumber.numberWithInt((<any>AVAudioQuality).Medium.rawValue), NSNumber.numberWithFloat(16000.0), NSNumber.numberWithInt(1)]),
            //   (<any>["AVFormatIDKey", "AVEncoderAudioQualityKey", "AVSampleRateKey", "AVNumberOfChannelsKey"]));

            let recordSetting = NSMutableDictionary.alloc().init();
            recordSetting.setValueForKey(NSNumber.numberWithInt(kAudioFormatMPEG4AAC), 'AVFormatIDKey');
            if (options.sampleRateConversionQuality) {
              recordSetting.setValueForKey(NSNumber.numberWithInt(options.sampleRateConversionQuality), 'AVEncoderAudioQualityKey');
            }
            else {
              recordSetting.setValueForKey(NSNumber.numberWithInt((<any>AVAudioQuality).Medium.rawValue), 'AVEncoderAudioQualityKey');
            }
            recordSetting.setValueForKey(NSNumber.numberWithFloat(options.sampleRate), 'AVSampleRateKey');
            recordSetting.setValueForKey(NSNumber.numberWithInt(1), 'AVNumberOfChannelsKey');

            errorRef = new interop.Reference();

            let url = NSURL.fileURLWithPath(options.filename);

            this._recorder = (<any>AVAudioRecorder.alloc()).initWithURLSettingsError(url, recordSetting, errorRef);
            if (errorRef && errorRef.value) {
              console.log(errorRef.value);
            } else {
              this._recorder.delegate = this;
              if (options.metering) {
                this._recorder.meteringEnabled = true;
              }
              this._recorder.prepareToRecord();
              this._recorder.record();
              resolve();
            }
          }
        });

      } catch (ex) {
        reject(ex);
      }
    });
  }

  public pause(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._recorder) {
          this._recorder.pause();
        }
        resolve();
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public resume(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._recorder) {
          this._recorder.record();
        }
        resolve();
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public stop(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._recorder) {
          this._recorder.stop();
        }
        // may need this in future
        // this._recordingSession.setActiveError(false, null);
        this._recorder.meteringEnabled = false;
        resolve();
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public dispose(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._recorder) {
          this._recorder.stop();
          this._recorder.meteringEnabled = false;
          this._recordingSession.setActiveError(false, null);
          this._recorder.release();
          this._recorder = undefined;
        }
        resolve();
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public isRecording() {
    return this._recorder && this._recorder.recording;
  }

  public getMeters(channel: number) {
    if (this._recorder) {
      if (!this._recorder.meteringEnabled) {
        this._recorder.meteringEnabled = true;
      }
      this._recorder.updateMeters();
      return this._recorder.averagePowerForChannel(channel);
    }
  }


  public audioRecorderDidFinishRecording(recorder: any, success: boolean) {
    console.log(`audioRecorderDidFinishRecording: ${success}`);
  }
}