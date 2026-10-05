import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

/**
 * Layout chung chuẩn mực cho toàn bộ các trang của Grand Horizon (Khách hàng & Portal)
 * Tự động bọc Header (kèm Wishlist counter) và Footer
 */
const MainLayout = ({ children, wishlistCount = 0, onWishlistClick }) => {
  return (
    <div className="font-sans antialiased text-[#373435] bg-[#fafaf8] min-h-screen flex flex-col selection:bg-[#b9a277] selection:text-white">
      {/* Reusable Header */}
      <Header 
        wishlistCount={wishlistCount} 
        onWishlistClick={onWishlistClick} 
        lang={lang}
        onLanguageChange={onLanguageChange}
      />

      {/* Main Page Content */}
      <main className="w-full pt-20 bg-[#fafaf8] flex-1">
        {children}
      </main>

      {/* Reusable Footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;
