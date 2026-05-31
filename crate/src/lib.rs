use wasm_bindgen::prelude::*;

/// Cooley-Tukey radix-2 DIT FFT (in-place, power-of-2 length)
fn fft(re: &mut [f32], im: &mut [f32]) {
    let n = re.len();
    // Bit-reversal permutation
    let mut j = 0usize;
    for i in 1..n {
        let mut bit = n >> 1;
        while j & bit != 0 {
            j ^= bit;
            bit >>= 1;
        }
        j ^= bit;
        if i < j {
            re.swap(i, j);
            im.swap(i, j);
        }
    }
    // Butterfly
    let mut len = 2usize;
    while len <= n {
        let half = len / 2;
        let angle = -2.0 * std::f32::consts::PI / len as f32;
        let (wr0, wi0) = (angle.cos(), angle.sin());
        let mut i = 0;
        while i < n {
            let (mut wr, mut wi) = (1.0f32, 0.0f32);
            for k in 0..half {
                let (tr, ti) = (
                    wr * re[i + k + half] - wi * im[i + k + half],
                    wr * im[i + k + half] + wi * re[i + k + half],
                );
                re[i + k + half] = re[i + k] - tr;
                im[i + k + half] = im[i + k] - ti;
                re[i + k] += tr;
                im[i + k] += ti;
                (wr, wi) = (wr * wr0 - wi * wi0, wr * wi0 + wi * wr0);
            }
            i += len;
        }
        len <<= 1;
    }
}

/// Find dominant frequency from PCM samples.
/// Returns frequency in Hz, or 0.0 if signal is too quiet.
#[wasm_bindgen]
pub fn find_dominant_frequency(samples: &[f32], sample_rate: f32) -> f32 {
    // Use the largest power-of-2 that fits in samples
    let n = samples.len().next_power_of_two() / 2 * 2; // ensure even
    let fft_size = n.min(16384).next_power_of_two();
    let fft_size = if fft_size > samples.len() { fft_size >> 1 } else { fft_size };
    if fft_size < 2 {
        return 0.0;
    }

    let mut re: Vec<f32> = (0..fft_size)
        .map(|i| {
            // Hann window
            let w = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / (fft_size - 1) as f32).cos());
            samples[i] * w
        })
        .collect();
    let mut im = vec![0.0f32; fft_size];

    fft(&mut re, &mut im);

    // Find peak magnitude in [80 Hz, 4000 Hz] (ignore DC and ultrasonic)
    let freq_resolution = sample_rate / fft_size as f32;
    let bin_lo = (80.0 / freq_resolution) as usize;
    let bin_hi = ((4000.0 / freq_resolution) as usize).min(fft_size / 2);

    let rms: f32 = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    if rms < 1e-4 {
        return 0.0;
    }

    let (peak_bin, peak_mag) = (bin_lo..=bin_hi)
        .map(|b| (b, re[b] * re[b] + im[b] * im[b]))
        .fold((0, 0.0f32), |(bi, bm), (ci, cm)| {
            if cm > bm { (ci, cm) } else { (bi, bm) }
        });

    if peak_mag < 1e-10 {
        return 0.0;
    }

    // Quadratic interpolation for sub-bin accuracy
    if peak_bin == 0 || peak_bin >= fft_size / 2 {
        return peak_bin as f32 * freq_resolution;
    }
    let m0 = (re[peak_bin - 1] * re[peak_bin - 1] + im[peak_bin - 1] * im[peak_bin - 1]).sqrt();
    let m1 = peak_mag.sqrt();
    let m2 = (re[peak_bin + 1] * re[peak_bin + 1] + im[peak_bin + 1] * im[peak_bin + 1]).sqrt();
    let delta = 0.5 * (m2 - m0) / (2.0 * m1 - m0 - m2 + 1e-10);
    (peak_bin as f32 + delta) * freq_resolution
}
