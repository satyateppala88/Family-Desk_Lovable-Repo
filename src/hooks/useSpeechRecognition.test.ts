import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechRecognition } from "./useSpeechRecognition";

describe("useSpeechRecognition", () => {
  beforeEach(() => {
    // Clear any existing mock
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it("returns isSupported=false when API unavailable", () => {
    const { result } = renderHook(() =>
      useSpeechRecognition({ onResult: vi.fn() })
    );
    expect(result.current.isSupported).toBe(false);
    expect(result.current.isListening).toBe(false);
  });

  it("returns isSupported=true when API available", () => {
    const MockRecognition = vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      lang: "",
      continuous: false,
      interimResults: false,
      onresult: null,
      onerror: null,
      onend: null,
    }));
    (window as any).SpeechRecognition = MockRecognition;

    const { result } = renderHook(() =>
      useSpeechRecognition({ onResult: vi.fn() })
    );
    expect(result.current.isSupported).toBe(true);
  });

  it("start() does nothing when API unavailable", () => {
    const { result } = renderHook(() =>
      useSpeechRecognition({ onResult: vi.fn() })
    );
    // Should not throw
    act(() => {
      result.current.start();
    });
    expect(result.current.isListening).toBe(false);
  });

  it("stop() does nothing when not started", () => {
    const { result } = renderHook(() =>
      useSpeechRecognition({ onResult: vi.fn() })
    );
    act(() => {
      result.current.stop();
    });
    expect(result.current.isListening).toBe(false);
  });
});
