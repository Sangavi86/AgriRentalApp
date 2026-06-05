import { Platform, Alert } from 'react-native';

/**
 * Universal alert that works on both Web (browsers) and Native (iOS/Android).
 * On Web, it falls back to window.alert or window.confirm.
 */
export const safeAlert = (title, message, buttons = []) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      // Simplified confirm mapping for web
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        const okButton = buttons.find(b => b.text.toLowerCase() === 'yes' || b.text.toLowerCase() === 'ok' || !b.style);
        if (okButton && okButton.onPress) okButton.onPress();
      } else {
        const cancelButton = buttons.find(b => b.text.toLowerCase() === 'no' || b.text.toLowerCase() === 'cancel' || b.style === 'cancel');
        if (cancelButton && cancelButton.onPress) cancelButton.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
