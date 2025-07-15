"use client";
import { useState } from "react";
import { createPortal } from "react-dom";

export interface NavbarProps {
  isNight: boolean;
  onToggleTheme: () => void;
}

export default function Navbar({ isNight, onToggleTheme }: NavbarProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <>
      <nav className="w-full flex items-center justify-between px-8 py-4 bg-white/10 backdrop-blur-3xl border-b border-white/15 fixed top-0 left-0 z-50 shadow-none" style={{boxShadow: '0 2px 24px 0 rgba(31,38,135,0.08)'}}>
        {/* Left: Site Name */}
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-extrabold tracking-wide select-none transition-colors duration-300 flex items-center gap-1 ${isNight ? 'text-white' : 'text-black'}`}
            style={{position:'relative'}}>
            <span
              role="img"
              aria-label="Magic wand"
              tabIndex={0}
              className="mr-1 cursor-pointer emoji-animate"
              style={{display:'inline-block', fontSize:'1.3em', filter:'drop-shadow(0 0 6px #a084ff88)'}}
            >
              ✨
            </span>
            Summarize X
            <style>{`
              .emoji-animate {
                transition: transform 0.3s cubic-bezier(.4,2,.6,1), filter 0.3s;
                will-change: transform, filter;
                animation: emoji-bounce 2.2s infinite cubic-bezier(.4,2,.6,1);
              }
              .emoji-animate:hover, .emoji-animate:focus {
                transform: scale(1.25) rotate(-12deg);
                filter: drop-shadow(0 0 16px #a084ffcc) brightness(1.2);
                animation: none;
              }
              @keyframes emoji-bounce {
                0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
                10% { transform: translateY(-2px) scale(1.08) rotate(-6deg); }
                20% { transform: translateY(-6px) scale(1.13) rotate(6deg); }
                30% { transform: translateY(-10px) scale(1.18) rotate(-8deg); }
                40% { transform: translateY(-7px) scale(1.13) rotate(8deg); }
                50% { transform: translateY(-2px) scale(1.08) rotate(-4deg); }
                60%, 90% { transform: translateY(0) scale(1) rotate(0deg); }
              }
            `}</style>
          </span>
        </div>
        {/* Right: About Us only */}
        <div className="flex items-center gap-4">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 hover:bg-white/80 shadow border border-white/30 transition-all duration-200 focus:outline-none"
            onClick={onToggleTheme}
            aria-label={isNight ? 'Switch to Day' : 'Switch to Night'}
          >
            {isNight ? (
              // Moon icon
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22">
                <path d="M21 12.79A9 9 0 0 1 12.79 3a7 7 0 1 0 8.21 9.79z" fill="#f5e9ff" stroke="#b6b6e0" strokeWidth="1.5" />
              </svg>
            ) : (
              // Sun icon
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22">
                <circle cx="12" cy="12" r="5" fill="#ffe066" stroke="#fbbf24" strokeWidth="1.5" />
                <g stroke="#fbbf24" strokeWidth="1.2">
                  <line x1="12" y1="2" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="2" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="22" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </g>
              </svg>
            )}
          </button>
          <button
            className={`font-semibold px-3 py-1 rounded transition ${isNight ? 'text-white/90 hover:text-blue-300' : 'text-black hover:text-blue-700'}`}
            onClick={() => setAboutOpen(true)}
          >
            About Us
          </button>
        </div>
      </nav>
      {/* About Us Modal rendered via portal at document.body */}
      {aboutOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="animate-modal-pop bg-white/40 backdrop-blur-2xl rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative flex flex-col items-center justify-center border border-white/30" style={{boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'}}>
            <button
              className="absolute top-3 right-3 text-gray-700 hover:text-red-500 text-4xl font-extrabold z-60 transition-all duration-200"
              onClick={() => setAboutOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-blue-900 text-center w-full">About SummarizeX</h2>
            <div className="flex flex-col md:flex-row gap-6 w-full mb-6">
              <p className="text-gray-900 font-semibold leading-relaxed flex-1 text-base md:text-lg">
                👋 Hi, I'm Abdullah Mansoor, a dedicated and curious Computer Science student at the Ghulam Ishaq Khan Institute of Engineering Sciences and Technology (GIKI). With a strong foundation in programming, web development, and artificial intelligence, I've worked on a range of projects involving React, Python, and machine learning.
              </p>
              <p className="text-gray-900 font-semibold leading-relaxed flex-1 text-base md:text-lg">
                🛠️ This website is part of my internship at Nexium, where I'm learning to build full-stack applications using modern tools like Next.js, Tailwind CSS, Supabase, and MongoDB Atlas. The goal of this project is not just to build a Blog Summariser, but to improve my understanding of clean UI, component-based architecture, and efficient backend integration.
              </p>
            </div>
            <div className="flex gap-4 mt-2">
              <a
                href="https://www.linkedin.com/in/abdullah-mansoor-a9a424218/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition text-lg"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/NOOBBoy35"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-semibold shadow transition text-lg"
              >
                GitHub
              </a>
            </div>
          </div>
          {/* Modal animation style */}
          <style>{`
            .animate-modal-pop {
              animation: modalPopIn 0.5s cubic-bezier(0.23, 1, 0.32, 1);
            }
            @keyframes modalPopIn {
              0% {
                opacity: 0;
                transform: translateY(-100px) scale(0.8);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  );
} 