import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    
    // Auto-hide the notification after 4 seconds
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Global Toast UI */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-fade-in-up">
          <div className={`flex items-start gap-3 p-4 w-80 rounded-xl shadow-2xl border-l-4 ${
            notification.type === 'error' 
              ? 'bg-white dark:bg-gray-800 border-red-500' 
              : 'bg-white dark:bg-gray-800 border-emerald-500'
          }`}>
            
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {notification.type === 'error' 
                ? <AlertCircle className="text-red-500" size={20} /> 
                : <CheckCircle2 className="text-emerald-500" size={20} />
              }
            </div>

            {/* Message */}
            <div className="flex-1">
              <h4 className={`text-sm font-bold ${notification.type === 'error' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                {notification.type === 'error' ? 'Action Failed' : 'Success'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                {notification.message}
              </p>
            </div>

            {/* Close Button */}
            <button 
              onClick={() => setNotification(null)} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};