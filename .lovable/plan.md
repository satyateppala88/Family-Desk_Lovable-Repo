

# Add Voice-to-Text for AI Pantry Import and Chatbot

Add microphone input using the browser's built-in Web Speech API -- no external dependencies or API keys needed. Works on Chrome, Edge, Safari, and most modern browsers.

---

## 1. Create a Reusable `useSpeechRecognition` Hook

**New file: `src/hooks/useSpeechRecognition.ts`**

A shared hook that manages:
- Starting/stopping the browser's `SpeechRecognition` API
- Returning `transcript`, `isListening`, `start()`, `stop()`, and `isSupported`
- Accepting an `onResult` callback to append recognized text
- Handling errors gracefully (permission denied, not supported)
- Configured for continuous recognition with interim results
- Language set to `en-IN` (Indian English) for better recognition of Indian terms

## 2. Update AI Pantry Import Dialog

**File: `src/components/grocery/AIPantryImportDialog.tsx`**

- Import `useSpeechRecognition` hook
- Add a microphone button next to the textarea
- When recording, append recognized speech into the existing textarea content
- Show a visual indicator (pulsing red dot or highlighted mic icon) when actively listening
- Mic button toggles between start/stop

## 3. Update AI Chat Widget

**File: `src/components/ai/AIChatWidget.tsx`**

- Import `useSpeechRecognition` hook
- Add a microphone button next to the Send button in the input area
- When recording, fill the input field with recognized speech
- Show visual feedback while listening
- Mic button toggles between start/stop

---

## Technical Details

**Hook API:**
```typescript
const { isListening, isSupported, start, stop } = useSpeechRecognition({
  onResult: (text: string) => setInput(prev => prev + " " + text),
  language: "en-IN",
  continuous: true,
});
```

**UI Pattern (both components):**
- A `Mic` / `MicOff` icon button from lucide-react
- When `isListening`: icon turns red/pulsing with `animate-pulse`
- When `!isSupported`: button is hidden or disabled with a tooltip
- Pressing mic while already listening stops it

**Browser Compatibility:**
- Uses `webkitSpeechRecognition` (Chrome/Edge) and `SpeechRecognition` (Firefox/Safari)
- Gracefully degrades: if not supported, the mic button is simply not shown

