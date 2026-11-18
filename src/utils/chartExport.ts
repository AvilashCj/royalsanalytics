import html2canvas from 'html2canvas';

/**
 * High-resolution Chart PNG Export Utility using html2canvas
 * Targets specific DOM chart containers, modals, or SVG panels,
 * rasterizing all HTML headers, legend badges, tooltips, and SVG vector graphics
 * into crystal-clear 2x Retina PNG images saved directly to the user's device.
 */

export interface ExportChartOptions {
  scale?: number;
  backgroundColor?: string;
  watermarkText?: string;
  excludeClass?: string;
}

export async function exportChartToPNG(
  target: string | HTMLElement,
  filename = 'cricket_chart.png',
  options: ExportChartOptions = {}
): Promise<boolean> {
  try {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) {
      console.warn(`[chartExport] Element not found for target:`, target);
      return false;
    }

    const computedBg = window.getComputedStyle(element).backgroundColor;
    const defaultBg =
      computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent'
        ? computedBg
        : '#FFFFFF';

    const {
      scale = 2,
      backgroundColor = defaultBg,
      watermarkText = 'Rajasthan Royals SupeRR Selector · Pressure Intelligence',
      excludeClass = 'no-export',
    } = options;

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor,
      logging: false,
      ignoreElements: (node) => {
        if (
          node instanceof HTMLElement &&
          (node.classList.contains(excludeClass) || node.hasAttribute('data-no-export'))
        ) {
          return true;
        }
        return false;
      },
      onclone: (_clonedDoc, clonedElement) => {
        clonedElement.style.borderRadius = '16px';
        clonedElement.style.overflow = 'hidden';
      },
    });

    if (watermarkText) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const padding = 16 * scale;
        ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillText(watermarkText, canvas.width - padding + 1, canvas.height - padding + 1);

        ctx.fillStyle = '#FF2E93';
        ctx.fillText(watermarkText, canvas.width - padding, canvas.height - padding);
      }
    }

    const pngUrl = canvas.toDataURL('image/png', 1.0);
    const downloadLink = document.createElement('a');
    const safeFilename = filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`;
    downloadLink.download = safeFilename;
    downloadLink.href = pngUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    return true;
  } catch (err) {
    console.error('[chartExport] html2canvas PNG export failed:', err);
    return false;
  }
}
