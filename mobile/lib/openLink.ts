import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/**
 * Open an external URL (Cashfree payment page, live-class join link) in the
 * in-app browser so the student stays in the app and returns to it after
 * paying / joining. Falls back to the system browser if the in-app browser
 * cannot open the URL. Never invents a URL — callers pass only URLs the
 * backend supplied.
 */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
