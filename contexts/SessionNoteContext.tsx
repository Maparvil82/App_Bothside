import React, { createContext, useContext, useState, useCallback } from 'react';

interface SessionNoteContextType {
  isModalVisible: boolean;
  sessionId: string | null;
  openSessionNoteModal: (sessionId: string) => void;
  closeSessionNoteModal: () => void;
}

const SessionNoteContext = createContext<SessionNoteContextType | undefined>(undefined);

export const SessionNoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const openSessionNoteModal = useCallback((id: string) => {
    setSessionId(id);
    setIsModalVisible(true);
  }, []);

  const closeSessionNoteModal = useCallback(() => {
    setIsModalVisible(false);
    setSessionId(null);
  }, []);

  const value: SessionNoteContextType = {
    isModalVisible,
    sessionId,
    openSessionNoteModal,
    closeSessionNoteModal,
  };

  return (
    <SessionNoteContext.Provider value={value}>
      {children}
    </SessionNoteContext.Provider>
  );
};

export const useSessionNoteModal = (): SessionNoteContextType => {
  const context = useContext(SessionNoteContext);
  if (!context) {
    throw new Error('useSessionNoteModal debe ser usado dentro de SessionNoteProvider');
  }
  return context;
};
