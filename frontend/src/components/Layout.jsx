import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AddTransactionModal from './AddTransactionModal';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100">
      {/* Sidebar navigation */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar 
          onMenuClick={() => setSidebarOpen(true)} 
          onQuickAction={() => setTransactionModalOpen(true)}
        />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ openAddTransaction: () => setTransactionModalOpen(true) }} />
        </main>
      </div>

      {/* Quick Add Transaction Modal accessible anywhere */}
      {transactionModalOpen && (
        <AddTransactionModal 
          isOpen={transactionModalOpen} 
          onClose={() => setTransactionModalOpen(false)}
          onSuccess={() => {
            setTransactionModalOpen(false);
            // Refresh route or dispatch event
            window.dispatchEvent(new CustomEvent('financial_data_updated'));
          }}
        />
      )}
    </div>
  );
}
