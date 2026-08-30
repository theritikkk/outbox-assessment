import toast from 'react-hot-toast';

export const showSuccess = (message: string) => {
  toast.success(message, {
    style: {
      border: '1px solid #10b981',
      padding: '16px',
      color: '#064e3b',
    },
    iconTheme: {
      primary: '#10b981',
      secondary: '#fff',
    },
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    style: {
      border: '1px solid #ef4444',
      padding: '16px',
      color: '#7f1d1d',
    },
  });
};
