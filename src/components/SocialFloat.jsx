import React from 'react';

const SocialFloat = () => {
    const socialLinks = [
        {
            id: 'tiktok',
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
                </svg>
            ),
            url: 'https://www.tiktok.com/@maquinariaemaq.or?_r=1&_t=ZS-960lZRov6W5',
            color: 'bg-black text-white'
        },
        {
            id: 'facebook',
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            ),
            url: 'https://www.facebook.com/share/17QwCLw8pf/',
            color: 'bg-[#1877F2] text-white'
        }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-4">
            {socialLinks.map((link) => (
                <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${link.color} w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 animate-in slide-in-from-right-10`}
                >
                    {link.icon}
                </a>
            ))}
        </div>
    );
};

export default SocialFloat;
