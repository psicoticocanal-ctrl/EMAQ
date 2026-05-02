import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SocialFloat from '../components/SocialFloat';

const PublicLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-white dark:bg-[#000000] font-display relative">
            <Navbar />
            <main className="pt-20">
                {children}
            </main>
            <Footer />
            <SocialFloat />
        </div>
    );
};

export default PublicLayout;
