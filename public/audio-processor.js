/**
 * AudioWorkletProcessor for voice session audio processing.
 * 
 * Offloads audio processing from the main thread for better performance.
 * Converts Float32 PCM data to Int16 format expected by Gemini Live API.
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 4096;
    this._buffer = new Float32Array(this._bufferSize);
    this._bufferIndex = 0;
  }

  /**
   * Convert Float32 audio samples to Int16 format
   * @param {Float32Array} float32Array - Input audio samples
   * @returns {Int16Array} - Converted Int16 samples
   */
  floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp value to [-1, 1] range
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit integer
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  /**
   * Process incoming audio data
   * @param {Float32Array[][]} inputs - Input audio channels
   * @param {Float32Array[][]} outputs - Output audio channels (unused)
   * @param {Object} parameters - Audio parameters (unused)
   * @returns {boolean} - True to keep processor alive
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // No input connected
    if (!input || input.length === 0) {
      return true;
    }

    const channelData = input[0];
    
    // No channel data
    if (!channelData || channelData.length === 0) {
      return true;
    }

    // Accumulate samples into buffer
    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._bufferIndex++] = channelData[i];
      
      // Buffer is full, send to main thread
      if (this._bufferIndex >= this._bufferSize) {
        // Convert to Int16 for Gemini
        const int16Data = this.floatTo16BitPCM(this._buffer);
        
        // Send the audio chunk to main thread
        this.port.postMessage({
          type: 'audio',
          audioData: int16Data.buffer,
          sampleRate: sampleRate // global from AudioWorkletGlobalScope
        }, [int16Data.buffer]);
        
        // Reset buffer
        this._buffer = new Float32Array(this._bufferSize);
        this._bufferIndex = 0;
      }
    }

    return true;
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);
