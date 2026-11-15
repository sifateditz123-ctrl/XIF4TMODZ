import React from 'react';
import { ExternalLink, X } from 'lucide-react';

function getEmbedUrl(url = ''): string | null {
  try {
    if (url.includes('youtube.com/watch?v=')) {
      const id = new URL(url).searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export default function VideoModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  if (!url) return null;
  const embedUrl = getEmbedUrl(url);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Setup video for ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
    >
      <div className="cyber-card cyber-glow-border w-full max-w-2xl rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-white sm:text-base">
            Setup Guide: {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              src={embedUrl}
              title={title}
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-[#090b14] p-8 text-center">
            <p className="text-sm text-slate-300">
              Open the video tutorial in a new tab to view full setup instructions.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white"
            >
              Open Setup Video <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
